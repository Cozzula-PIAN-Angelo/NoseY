package it.epicode.nosey.user;

import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.PaginaResponse;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Gestione degli utenti da parte di ADMIN e SUPERADMIN (progettazione v4, sezioni 12 e 13).
 * Il ruolo minimo lo controlla SecurityConfig sul percorso; qui la regola della decisione D16:
 * si agisce solo su utenti di ruolo inferiore, mai su se stessi.
 */
@Service
@RequiredArgsConstructor
public class AdminUtenteService {

	private static final String SUPERADMIN = "SUPERADMIN";

	private final UtenteRepository utenteRepository;
	private final RuoloRepository ruoloRepository;
	private final TokenService tokenService;

	@Transactional(readOnly = true)
	public PaginaResponse<AdminUtenteResponse> lista(String search, StatoUtente stato, int page, int size) {
		// id come spareggio: con lo stesso creatoIl le pagine restano stabili.
		PageRequest pagina = PageRequest.of(page, size,
				Sort.by(Sort.Order.desc("creatoIl"), Sort.Order.desc("id")));
		return PaginaResponse.di(utenteRepository.findAll(filtri(search, stato), pagina)
				.map(AdminUtenteResponse::da));
	}

	@Transactional
	public AdminUtenteResponse cambiaStato(UUID utenteId, CambiaStatoUtenteRequest richiesta, UUID adminId) {
		// L'anonimizzazione ha un endpoint proprio (sezione 2): qui solo ATTIVO e SOSPESO.
		if (richiesta.stato() == StatoUtente.ANONIMIZZATO) {
			throw new ApplicazioneException(CodiceErrore.STATO_NON_AMMESSO, "Lo stato ammesso e' ATTIVO o SOSPESO");
		}
		Utente utente = trovaConLock(utenteId);
		verificaRuoloInferiore(adminId, utente);
		if (utente.getStato() == StatoUtente.ANONIMIZZATO) {
			throw new ApplicazioneException(CodiceErrore.UTENTE_ANONIMIZZATO, "L'utente e' anonimizzato");
		}

		// Stesso stato: niente da fare (decisione 21).
		if (utente.getStato() != richiesta.stato()) {
			utente.setStato(richiesta.stato());
			if (richiesta.stato() == StatoUtente.SOSPESO) {
				tokenService.revocaTutti(utente.getId());
			}
		}
		return AdminUtenteResponse.da(utente);
	}

	@Transactional
	public AdminUtenteResponse cambiaRuolo(UUID utenteId, CambiaRuoloRequest richiesta, UUID superadminId) {
		if (SUPERADMIN.equals(richiesta.ruolo())) {
			throw new ApplicazioneException(CodiceErrore.RUOLO_NON_AMMESSO, "Il ruolo SUPERADMIN non si assegna via API");
		}
		// Un nome che non esiste e' un errore del DTO (decisione 21).
		Ruolo ruolo = ruoloRepository.findByNome(richiesta.ruolo())
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.VALIDAZIONE, "Uno o piu' campi non sono validi",
						Map.of("ruolo", "deve essere USER o ADMIN")));

		Utente utente = trovaConLock(utenteId);
		verificaRuoloInferiore(superadminId, utente);
		if (!utente.isVerificato()) {
			throw new ApplicazioneException(CodiceErrore.UTENTE_NON_VERIFICATO, "L'utente non ha verificato l'email");
		}
		if (utente.getStato() != StatoUtente.ATTIVO) {
			throw new ApplicazioneException(CodiceErrore.UTENTE_NON_ATTIVO, "L'utente e' sospeso o anonimizzato");
		}

		// Stesso ruolo: i token restano validi (decisione 21).
		if (!utente.getRuolo().getId().equals(ruolo.getId())) {
			utente.setRuolo(ruolo);
			// Il ruolo e' scritto nel token: quelli gia' emessi avrebbero quello vecchio.
			tokenService.revocaTutti(utente.getId());
		}
		return AdminUtenteResponse.da(utente);
	}

	/**
	 * Decisione D16: chi chiede agisce solo su utenti con ruolo (livello) inferiore al proprio,
	 * mai su se stesso → 403 RUOLO_INSUFFICIENTE. Da usare anche per la moderazione dei contenuti
	 * (RimuoviFotoModerazione, AnnullaEventoModerazione), passando il proprietario.
	 */
	@Transactional(readOnly = true)
	public void verificaRuoloInferiore(UUID chiChiedeId, Utente bersaglio) {
		if (bersaglio.getId().equals(chiChiedeId)) {
			throw new ApplicazioneException(CodiceErrore.RUOLO_INSUFFICIENTE, "Non puoi agire su te stesso");
		}
		Utente chiChiede = utenteRepository.findById(chiChiedeId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Utente non trovato"));
		if (bersaglio.getRuolo().getLivello() >= chiChiede.getRuolo().getLivello()) {
			throw new ApplicazioneException(CodiceErrore.RUOLO_INSUFFICIENTE,
					"Puoi agire solo su utenti con un ruolo inferiore al tuo");
		}
	}

	private Utente trovaConLock(UUID id) {
		return utenteRepository.findConLockById(id)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Utente non trovato"));
	}

	/** search: contiene, senza distinzione di maiuscole, su email, nome o cognome. */
	private static Specification<Utente> filtri(String search, StatoUtente stato) {
		String testo = search == null ? "" : search.strip();
		return (root, query, cb) -> {
			List<Predicate> condizioni = new ArrayList<>();
			if (!testo.isEmpty()) {
				String pattern = "%" + escapeLike(testo.toLowerCase(Locale.ROOT)) + "%";
				condizioni.add(cb.or(
						cb.like(cb.lower(root.get("email")), pattern, '\\'),
						cb.like(cb.lower(root.get("nome")), pattern, '\\'),
						cb.like(cb.lower(root.get("cognome")), pattern, '\\')));
			}
			if (stato != null) {
				condizioni.add(cb.equal(root.get("stato"), stato));
			}
			return cb.and(condizioni.toArray(Predicate[]::new));
		};
	}

	// % e _ cercati come caratteri normali, non come jolly del LIKE.
	private static String escapeLike(String testo) {
		return testo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}
}
