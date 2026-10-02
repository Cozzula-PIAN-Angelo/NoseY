package it.epicode.nosey.user;

import it.epicode.nosey.auth.PasswordMax72ByteValidator;
import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.event.AnonimizzazioneEventiService;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.friendship.AmiciziaRepository;
import it.epicode.nosey.friendship.StatoAmicizia;
import it.epicode.nosey.notification.NotificaAmiciziaRepository;
import it.epicode.nosey.notification.NotificaChatRepository;
import it.epicode.nosey.notification.NotificaEventoRepository;
import it.epicode.nosey.notification.TipoNotificaAmicizia;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Anonimizzazione (progettazione v4, sezione 2; decisione 13): irreversibile, tutto in una transazione.
 * Restano le amicizie accettate, i messaggi, gli eventi in corso o conclusi e i loro ticket:
 * gli altri li vedono come "Utente anonimo", con attivo = false.
 */
@Service
@RequiredArgsConstructor
public class AnonimizzazioneService {

	private static final String SUPERADMIN = "SUPERADMIN";

	private final UtenteRepository utenteRepository;
	private final RuoloRepository ruoloRepository;
	private final PasswordEncoder passwordEncoder;
	private final TokenService tokenService;
	private final AnonimizzazioneEventiService anonimizzazioneEventiService;
	private final AmiciziaRepository amiciziaRepository;
	private final NotificaEventoRepository notificaEventoRepository;
	private final NotificaAmiciziaRepository notificaAmiciziaRepository;
	private final NotificaChatRepository notificaChatRepository;
	private final Clock clock;

	@Transactional
	public void anonimizza(UtenteAutenticato autenticato, AnonimizzazioneRequest richiesta) {
		// Il ruolo del token e' affidabile (un cambio di ruolo revoca i token). Per un SUPERADMIN si
		// bloccano prima tutti i SUPERADMIN attivi, lui compreso: due anonimizzazioni in parallelo non
		// passano entrambe il controllo, e non si bloccano a vicenda come con la propria riga per prima.
		List<Utente> superadminAttivi = SUPERADMIN.equals(autenticato.ruolo())
				? utenteRepository.trovaConLockPerRuoloEStato(SUPERADMIN, StatoUtente.ATTIVO)
				: List.of();
		Utente utente = utenteRepository.findConLockById(autenticato.id())
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Utente non trovato"));

		if (!passwordCorretta(richiesta.password(), utente.getPasswordHash())) {
			throw new ApplicazioneException(CodiceErrore.PASSWORD_ERRATA, "Password errata");
		}
		if (SUPERADMIN.equals(utente.getRuolo().getNome())) {
			// Lista vuota solo con un token emesso prima della promozione: si legge adesso.
			List<Utente> attivi = superadminAttivi.isEmpty()
					? utenteRepository.trovaConLockPerRuoloEStato(SUPERADMIN, StatoUtente.ATTIVO)
					: superadminAttivi;
			if (attivi.stream().allMatch(s -> s.getId().equals(utente.getId()))) {
				throw new ApplicazioneException(CodiceErrore.ULTIMO_SUPERADMIN,
						"Sei l'unico SUPERADMIN attivo: non puoi anonimizzarti");
			}
		}

		Instant adesso = clock.instant();
		anonimizzazioneEventiService.annullaEventiProprietario(utente.getId());
		anonimizzazioneEventiService.cancellaIscrizioniFuture(utente.getId());
		ritiraRichiestePendenti(utente, adesso);
		// Dopo eventi e amicizie: se ne fosse nata qualcuna per lui nel frattempo, sparisce anche quella.
		notificaEventoRepository.cancellaPerDestinatario(utente.getId());
		notificaAmiciziaRepository.cancellaPerDestinatario(utente.getId());
		notificaChatRepository.cancellaPerDestinatario(utente.getId());

		cancellaDatiPersonali(utente);
		utente.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
		utente.setStato(StatoUtente.ANONIMIZZATO);
		utente.setRuolo(ruoloRepository.findByNome("USER").orElseThrow());
		tokenService.revocaTutti(utente.getId());
	}

	/**
	 * Inviate e ricevute: la coppia torna neutra, come con RitiraRichiesta (sezione 8).
	 * chiusaDa resta null: vale solo per RIFIUTATA e RIMOSSA (ck_amicizia_chiusa).
	 */
	private void ritiraRichiestePendenti(Utente utente, Instant adesso) {
		for (Amicizia amicizia : amiciziaRepository.trovaPendentiConLock(utente.getId())) {
			amicizia.setStato(StatoAmicizia.RITIRATA);
			amicizia.setAggiornataIl(adesso);
			// La RICHIESTA ce l'ha sempre il ricevente.
			notificaAmiciziaRepository.deleteByAmiciziaIdAndDestinatarioIdAndTipo(amicizia.getId(),
					amicizia.getRicevente().getId(), TipoNotificaAmicizia.RICHIESTA);
		}
	}

	private void cancellaDatiPersonali(Utente utente) {
		utente.setEmail("anon-" + utente.getId() + "@nosey.invalid");
		utente.setNome("Utente");
		utente.setCognome("anonimo");
		utente.setIndirizzo(null);
		utente.setDataNascita(null);
		// Byte nel database (decisione 4): non resta nessun file da cancellare dopo il commit.
		utente.setImmagineProfilo(null);
		utente.setImmagineProfiloContentType(null);
		// Codice e scopo vanno null insieme (ck_utente_codice).
		utente.setCodice(null);
		utente.setCodiceScopo(null);
		utente.setCodiceInviatoIl(null);
	}

	/**
	 * Oltre 72 byte si risponde come per una password errata, senza chiamare matches()
	 * (con input troppo lunghi, a seconda della versione, lancia un'eccezione).
	 */
	private boolean passwordCorretta(String password, String hash) {
		return !PasswordMax72ByteValidator.superaLimite(password) && passwordEncoder.matches(password, hash);
	}
}
