package it.epicode.nosey.auth;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.Limite;
import it.epicode.nosey.common.LimitiService;
import it.epicode.nosey.mail.CodiceVerificaEmailEvent;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.ScopoCodice;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import it.epicode.nosey.user.UtenteResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Registrazione, verifica, login e logout (progettazione v4, sezione 1).
 * I controlli seguono l'ordine della progettazione: l'ordine decide quale errore vede il client.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

	private static final String RUOLO_INIZIALE = "USER";
	private static final Duration VALIDITA_CODICE = Duration.ofMinutes(15);
	private static final int MAX_TENTATIVI_CODICE = 5;
	private static final Duration INTERVALLO_MINIMO_INVII = Duration.ofSeconds(60);
	private static final Duration FINESTRA_INVII = Duration.ofHours(24);
	private static final int MAX_INVII_PER_FINESTRA = 5;

	private final UtenteRepository utenteRepository;
	private final RuoloRepository ruoloRepository;
	private final PasswordEncoder passwordEncoder;
	private final TokenService tokenService;
	private final LimitiService limitiService;
	private final ApplicationEventPublisher eventi;
	private final Clock clock;
	private final SecureRandom random = new SecureRandom();

	@Transactional
	public RegisterResponse registra(RegisterRequest richiesta) {
		Instant adesso = clock.instant();
		// Lock sulla riga: due registrazioni insieme sulla stessa email = un solo invio.
		Utente utente = utenteRepository.findConLockByEmail(richiesta.email()).orElse(null);

		if (utente == null) {
			utente = new Utente();
			utente.setEmail(richiesta.email());
			utente.setRuolo(ruoloRepository.findByNome(RUOLO_INIZIALE).orElseThrow());
			utente.setCreatoIl(adesso);
		} else {
			// Verificato, sospeso o anonimizzato: l'email e' occupata.
			if (utente.isVerificato() || utente.getStato() != StatoUtente.ATTIVO) {
				throw new ApplicazioneException(CodiceErrore.EMAIL_GIA_REGISTRATA, "Email gia' registrata");
			}
			controllaLimitiInvio(utente, adesso);
		}

		// Email nuova, oppure non verificata e ATTIVO: nessuno ha ancora dimostrato di possederla,
		// quindi la registrazione piu' recente sovrascrive i dati in sospeso.
		utente.setPasswordHash(passwordEncoder.encode(richiesta.password()));
		utente.setNome(richiesta.nome());
		utente.setCognome(richiesta.cognome());
		utente.setIndirizzo(richiesta.indirizzo());
		utente.setDataNascita(richiesta.dataNascita());
		String codice = nuovoCodice(utente, ScopoCodice.VERIFICA_EMAIL, adesso);

		// saveAndFlush: con due registrazioni in parallelo sulla stessa email nuova, uq_utente_email
		// scatta qui e il GestoreErrori risponde 409 EMAIL_GIA_REGISTRATA.
		utente = utenteRepository.saveAndFlush(utente);
		eventi.publishEvent(new CodiceVerificaEmailEvent(utente.getEmail(), utente.getNome(), codice));
		return new RegisterResponse(utente.getId(), utente.getEmail());
	}

	/**
	 * noRollbackFor: il tentativo consumato sul codice deve restare salvato anche quando la
	 * verifica fallisce, altrimenti il limite dei 5 tentativi si aggirerebbe.
	 */
	@Transactional(noRollbackFor = ApplicazioneException.class)
	public LoginResponse verifica(VerifyRequest richiesta) {
		Instant adesso = clock.instant();

		// 1. account inesistente o anonimizzato
		Utente utente = utenteRepository.findByEmail(richiesta.email())
				.filter(u -> u.getStato() != StatoUtente.ANONIMIZZATO)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.CODICE_NON_VALIDO, "Codice non valido"));
		// 2. gia' verificato
		if (utente.isVerificato()) {
			throw new ApplicazioneException(CodiceErrore.GIA_VERIFICATO, "Account gia' verificato");
		}
		// 3. sospeso
		if (utente.getStato() == StatoUtente.SOSPESO) {
			throw new ApplicazioneException(CodiceErrore.ACCOUNT_SOSPESO, "Account sospeso");
		}
		// 4. nessun codice VERIFICA_EMAIL ancora utilizzabile
		if (!codiceUtilizzabile(utente, ScopoCodice.VERIFICA_EMAIL, adesso)) {
			throw new ApplicazioneException(CodiceErrore.CODICE_SCADUTO, "Codice scaduto: richiedine uno nuovo");
		}
		// 5. tentativo consumato PRIMA del confronto
		if (utenteRepository.consumaTentativoCodice(utente.getId(), MAX_TENTATIVI_CODICE) == 0) {
			throw new ApplicazioneException(CodiceErrore.CODICE_SCADUTO, "Codice scaduto: richiedine uno nuovo");
		}
		if (!stessoCodice(utente.getCodice(), richiesta.codice())) {
			throw new ApplicazioneException(CodiceErrore.CODICE_NON_VALIDO, "Codice non valido");
		}
		// 6. password della registrazione
		if (!passwordCorretta(richiesta.password(), utente.getPasswordHash())) {
			throw new ApplicazioneException(CodiceErrore.PASSWORD_ERRATA,
					"Password diversa da quella della registrazione: se non la ricordi, registrati di nuovo");
		}

		utente.setVerificato(true);
		utente.setCodice(null);
		utente.setCodiceScopo(null);
		utente.setCodiceTentativi(0);
		return rispostaLogin(utente);
	}

	@Transactional
	public LoginResponse login(LoginRequest richiesta) {
		// 1. troppi tentativi falliti per questa email: 429 anche con la password giusta
		limitiService.controlla(Limite.LOGIN_FALLITI, richiesta.email());

		// 2. inesistente, anonimizzato o password errata: stessa risposta, non si rivela quale.
		// Conta come tentativo fallito (il limite e' in memoria: il rollback non lo annulla).
		Utente utente = utenteRepository.findByEmail(richiesta.email())
				.filter(u -> u.getStato() != StatoUtente.ANONIMIZZATO)
				.filter(u -> passwordCorretta(richiesta.password(), u.getPasswordHash()))
				.orElse(null);
		if (utente == null) {
			limitiService.registra(Limite.LOGIN_FALLITI, richiesta.email());
			throw new ApplicazioneException(CodiceErrore.CREDENZIALI_ERRATE, "Email o password errate");
		}
		// 3. e 4.: solo dopo una password corretta, cosi' non rivelano quali email esistono.
		// Non contano come tentativi falliti e non li azzerano.
		if (!utente.isVerificato()) {
			throw new ApplicazioneException(CodiceErrore.EMAIL_NON_VERIFICATA, "Email non ancora verificata");
		}
		if (utente.getStato() == StatoUtente.SOSPESO) {
			throw new ApplicazioneException(CodiceErrore.ACCOUNT_SOSPESO, "Account sospeso");
		}
		limitiService.azzera(Limite.LOGIN_FALLITI, richiesta.email());
		return rispostaLogin(utente);
	}

	@Transactional
	public void logout(UtenteAutenticato utente) {
		tokenService.revoca(utente.jti());
	}

	private LoginResponse rispostaLogin(Utente utente) {
		TokenEmesso token = tokenService.emetti(utente);
		return new LoginResponse(token.token(), token.scadenza(), UtenteResponse.da(utente));
	}

	/**
	 * Oltre 72 byte si risponde come per una password errata, senza chiamare matches()
	 * (con input troppo lunghi, a seconda della versione, lancia un'eccezione).
	 */
	private boolean passwordCorretta(String password, String hash) {
		return !PasswordMax72ByteValidator.superaLimite(password) && passwordEncoder.matches(password, hash);
	}

	private static boolean stessoCodice(String salvato, String ricevuto) {
		// Confronto a tempo costante: il tempo di risposta non dice quante cifre sono giuste.
		return salvato != null && MessageDigest.isEqual(
				salvato.getBytes(StandardCharsets.UTF_8), ricevuto.getBytes(StandardCharsets.UTF_8));
	}

	/**
	 * Scaduto = oltre i 15 minuti dall'invio, oppure 5 tentativi usati. Il codice non si
	 * cancella quando scade: codice_inviato_il serve al limite dei 60 secondi.
	 */
	private static boolean codiceUtilizzabile(Utente utente, ScopoCodice scopo, Instant adesso) {
		return utente.getCodice() != null
				&& utente.getCodiceScopo() == scopo
				&& !adesso.isAfter(utente.getCodiceInviatoIl().plus(VALIDITA_CODICE))
				&& utente.getCodiceTentativi() < MAX_TENTATIVI_CODICE;
	}

	/**
	 * Al massimo 1 invio ogni 60 secondi e 5 ogni 24 ore per account (sezione 1). I contatori
	 * stanno in UTENTE: sopravvivono ai riavvii. Chi chiama ha gia' l'utente sotto lock.
	 */
	private static void controllaLimitiInvio(Utente utente, Instant adesso) {
		boolean troppoPresto = utente.getCodiceInviatoIl() != null
				&& adesso.isBefore(utente.getCodiceInviatoIl().plus(INTERVALLO_MINIMO_INVII));
		boolean finestraAperta = utente.getInviiCodiceDal() != null
				&& adesso.isBefore(utente.getInviiCodiceDal().plus(FINESTRA_INVII));
		if (troppoPresto || (finestraAperta && utente.getInviiCodice() >= MAX_INVII_PER_FINESTRA)) {
			throw new ApplicazioneException(CodiceErrore.TROPPE_RICHIESTE,
					"Troppi invii del codice: riprova piu' tardi");
		}
	}

	/**
	 * Un solo codice attivo per account: il nuovo sostituisce il precedente e azzera i tentativi.
	 * La finestra delle 24 ore riparte quando e' trascorsa.
	 */
	private String nuovoCodice(Utente utente, ScopoCodice scopo, Instant adesso) {
		String codice = "%06d".formatted(random.nextInt(1_000_000));
		utente.setCodice(codice);
		utente.setCodiceScopo(scopo);
		utente.setCodiceInviatoIl(adesso);
		utente.setCodiceTentativi(0);

		if (utente.getInviiCodiceDal() == null || !adesso.isBefore(utente.getInviiCodiceDal().plus(FINESTRA_INVII))) {
			utente.setInviiCodiceDal(adesso);
			utente.setInviiCodice(0);
		}
		utente.setInviiCodice(utente.getInviiCodice() + 1);
		return codice;
	}
}
