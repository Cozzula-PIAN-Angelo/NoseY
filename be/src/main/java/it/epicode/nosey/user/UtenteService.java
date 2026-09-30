package it.epicode.nosey.user;

import it.epicode.nosey.auth.PasswordMax72ByteValidator;
import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.ImmagineContenuto;
import it.epicode.nosey.common.ImmagineValidata;
import it.epicode.nosey.common.StorageService;
import it.epicode.nosey.mail.PasswordCambiataEmailEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * Profilo, cambio password e immagine del profilo (progettazione v4, sezione 2).
 * Chi fa la richiesta arriva sempre dal token, mai dal body.
 */
@Service
@RequiredArgsConstructor
public class UtenteService {

	private static final long DIMENSIONE_MASSIMA_IMMAGINE = 2 * 1024 * 1024;

	private final UtenteRepository utenteRepository;
	private final PasswordEncoder passwordEncoder;
	private final TokenService tokenService;
	private final StorageService storageService;
	private final ApplicationEventPublisher eventi;

	@Transactional(readOnly = true)
	public UtenteResponse vediProfilo(UtenteAutenticato autenticato) {
		return UtenteResponse.da(trova(autenticato.id()));
	}

	@Transactional
	public UtenteResponse modificaProfilo(UtenteAutenticato autenticato, ModificaUtenteRequest richiesta) {
		if (richiesta.vuota()) {
			throw new ApplicazioneException(CodiceErrore.RICHIESTA_VUOTA, "Nessun campo da modificare");
		}
		Utente utente = trova(autenticato.id());

		if (richiesta.nome() != null) {
			utente.setNome(richiesta.nome());
		}
		if (richiesta.cognome() != null) {
			utente.setCognome(richiesta.cognome());
		}
		if (richiesta.indirizzo() != null) {
			utente.setIndirizzo(richiesta.indirizzo().isEmpty() ? null : richiesta.indirizzo());
		}
		if (richiesta.dataNascita() != null) {
			utente.setDataNascita(richiesta.dataNascita());
		}
		return UtenteResponse.da(utente);
	}

	@Transactional
	public void cambiaPassword(UtenteAutenticato autenticato, CambioPasswordRequest richiesta) {
		// Lock sulla riga: due cambi di password insieme non si sovrappongono.
		Utente utente = utenteRepository.findConLockById(autenticato.id())
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Utente non trovato"));

		if (!passwordCorretta(richiesta.passwordAttuale(), utente.getPasswordHash())) {
			throw new ApplicazioneException(CodiceErrore.PASSWORD_ERRATA, "Password attuale errata");
		}
		// La password attuale e' appena stata verificata: basta confrontare le stringhe,
		// senza un secondo matches() (BCrypt e' lento apposta).
		if (richiesta.nuovaPassword().equals(richiesta.passwordAttuale())) {
			throw new ApplicazioneException(CodiceErrore.PASSWORD_UGUALE,
					"La nuova password deve essere diversa da quella attuale");
		}

		utente.setPasswordHash(passwordEncoder.encode(richiesta.nuovaPassword()));
		// Logout dalle altre sessioni: chi ha cambiato la password resta collegato.
		tokenService.revocaTuttiTranne(utente.getId(), autenticato.jti());
		eventi.publishEvent(new PasswordCambiataEmailEvent(utente.getEmail(), utente.getNome()));
	}

	/**
	 * La nuova immagine sovrascrive la precedente nella stessa transazione (decisione 4):
	 * non resta nessun file da cancellare dopo il commit.
	 */
	@Transactional
	public UtenteResponse caricaImmagine(UtenteAutenticato autenticato, MultipartFile file) {
		// Prima il file: presenza, dimensione e tipo fanno parte della validazione.
		ImmagineValidata immagine = storageService.valida(file, DIMENSIONE_MASSIMA_IMMAGINE);
		Utente utente = trova(autenticato.id());
		utente.setImmagineProfilo(immagine.contenuto());
		utente.setImmagineProfiloContentType(immagine.contentType());
		return UtenteResponse.da(utente);
	}

	@Transactional
	public void rimuoviImmagine(UtenteAutenticato autenticato) {
		Utente utente = trova(autenticato.id());
		// La versione, non i byte: il controllo non legge l'immagine dal database.
		if (utente.getImmagineProfiloVersione() == null) {
			throw new ApplicazioneException(CodiceErrore.NON_TROVATO, "Nessuna immagine del profilo");
		}
		utente.setImmagineProfilo(null);
		utente.setImmagineProfiloContentType(null);
	}

	/** GET pubblico dell'avatar di qualunque utente (decisione 9). */
	@Transactional(readOnly = true)
	public ImmagineContenuto immagine(UUID utenteId) {
		// getImmagineProfilo() e' l'unico punto che legge i byte (campo LAZY).
		return utenteRepository.findById(utenteId)
				.filter(u -> u.getImmagineProfiloVersione() != null)
				.map(u -> new ImmagineContenuto(u.getImmagineProfilo(), u.getImmagineProfiloContentType(),
						u.getImmagineProfiloVersione()))
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Immagine non trovata"));
	}

	private Utente trova(UUID id) {
		return utenteRepository.findById(id)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Utente non trovato"));
	}

	/**
	 * Oltre 72 byte si risponde come per una password errata, senza chiamare matches()
	 * (con input troppo lunghi, a seconda della versione, lancia un'eccezione).
	 */
	private boolean passwordCorretta(String password, String hash) {
		return !PasswordMax72ByteValidator.superaLimite(password) && passwordEncoder.matches(password, hash);
	}
}
