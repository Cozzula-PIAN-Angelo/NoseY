package it.epicode.nosey.user;

import it.epicode.nosey.auth.PasswordMax72ByteValidator;
import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.mail.PasswordCambiataEmailEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Profilo e cambio password dell'utente autenticato (progettazione v4, sezione 2).
 * Chi fa la richiesta arriva sempre dal token, mai dal body.
 */
@Service
@RequiredArgsConstructor
public class UtenteService {

	private final UtenteRepository utenteRepository;
	private final PasswordEncoder passwordEncoder;
	private final TokenService tokenService;
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
