package it.epicode.nosey.friendship;

import it.epicode.nosey.chat.Chat;
import it.epicode.nosey.chat.ChatRepository;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.Limite;
import it.epicode.nosey.common.LimitiService;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.notification.NotificaAmiciziaRepository;
import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.notification.TipoNotificaAmicizia;
import it.epicode.nosey.ticket.PartecipanteRepository;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * RichiediAmicizia, ListaAmici, ListaRichiesteRicevute, ListaRichiesteInviate, AccettaAmicizia,
 * RifiutaAmicizia, RitiraRichiesta, RimuoviAmicizia e il calcolo di statoAmicizia
 * (progettazione v4, sezione 8).
 */
@Service
@RequiredArgsConstructor
public class AmiciziaService {

	private final AmiciziaRepository amiciziaRepository;
	private final ChatRepository chatRepository;
	private final UtenteRepository utenteRepository;
	private final EventoRepository eventoRepository;
	private final PartecipanteRepository partecipanteRepository;
	private final NotificaAmiciziaRepository notificaAmiciziaRepository;
	private final NotificheService notificheService;
	private final LimitiService limitiService;
	private final Clock clock;

	// ListaAmici: per nome dell'amico, poi per cognome, senza distinguere maiuscole e minuscole.
	private static final Comparator<AmiciziaResponse> PER_NOME_DELL_AMICO = Comparator
			.comparing((AmiciziaResponse r) -> r.altroUtente().nome(), String.CASE_INSENSITIVE_ORDER)
			.thenComparing(r -> r.altroUtente().cognome(), String.CASE_INSENSITIVE_ORDER);

	@Transactional
	public AmiciziaResponse richiedi(RichiediAmiciziaRequest richiesta, UUID utenteId) {
		// Il tentativo conta anche se la richiesta poi fallisce (docs/interfacce.md).
		limitiService.consuma(Limite.RICHIESTE_AMICIZIA, utenteId.toString());

		UUID riceventeId = richiesta.riceventeId();
		if (riceventeId.equals(utenteId)) {
			throw new ApplicazioneException(CodiceErrore.RICHIESTA_A_SE_STESSO,
					"Non puoi chiedere l'amicizia a te stesso");
		}
		Utente ricevente = utenteRepository.findById(riceventeId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Utente non trovato"));
		Evento evento = eventoRepository.findById(richiesta.eventoId())
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));

		if (!haTicketOProprietario(evento, utenteId) || !haTicketOProprietario(evento, riceventeId)) {
			throw new ApplicazioneException(CodiceErrore.NESSUN_TICKET,
					"Tu e l'altro utente dovete avere un ticket per questo evento");
		}
		if (ricevente.getStato() != StatoUtente.ATTIVO) {
			throw new ApplicazioneException(CodiceErrore.UTENTE_NON_ATTIVO, "L'utente non e' piu' attivo");
		}

		Instant adesso = clock.instant();
		Amicizia amicizia = amiciziaRepository.findConLockByCoppia(utenteId, riceventeId).orElse(null);
		if (amicizia == null) {
			amicizia = new Amicizia();
			amicizia.setCreataIl(adesso);
			apri(amicizia, utenteId, ricevente, evento, adesso);
			// Due richieste incrociate nello stesso istante: la seconda viola uq_amicizia_coppia.
			// Con il flush qui l'errore arriva subito al GestoreErrori come 409 CONFLITTO.
			amiciziaRepository.saveAndFlush(amicizia);
			notificheService.notificaRichiestaAmicizia(amicizia);
			return risposta(amicizia, ricevente);
		}

		boolean chiusaDaMe = amicizia.getChiusaDa() != null && amicizia.getChiusaDa().getId().equals(utenteId);
		switch (amicizia.getStato()) {
			case PENDENTE -> {
				if (amicizia.getRichiedente().getId().equals(utenteId)) {
					throw new ApplicazioneException(CodiceErrore.RICHIESTA_GIA_INVIATA,
							"Hai gia' inviato una richiesta a questo utente");
				}
				throw new ApplicazioneException(CodiceErrore.RICHIESTA_GIA_RICEVUTA,
						"Questo utente ti ha gia' chiesto l'amicizia");
			}
			case ACCETTATA -> throw new ApplicazioneException(CodiceErrore.GIA_AMICI, "Siete gia' amici");
			case RIMOSSA -> {
				if (!chiusaDaMe) {
					throw new ApplicazioneException(CodiceErrore.AMICIZIA_NON_DISPONIBILE,
							"L'amicizia non e' disponibile");
				}
				riapri(amicizia, utenteId, ricevente, evento, adesso);
			}
			case RIFIUTATA -> {
				if (chiusaDaMe) {
					riapri(amicizia, utenteId, ricevente, evento, adesso);
				} else if (amicizia.isRichiestaMascherata()) {
					throw new ApplicazioneException(CodiceErrore.RICHIESTA_GIA_INVIATA,
							"Hai gia' inviato una richiesta a questo utente");
				} else {
					// Rifiuto silenzioso (D7): per chi chiede la richiesta riparte, nessuna notifica.
					// Si aggiornano anche evento e data, come in una richiesta vera (decisione 13).
					amicizia.setRichiestaMascherata(true);
					amicizia.setEvento(evento);
					amicizia.setAggiornataIl(adesso);
				}
			}
			case RITIRATA -> riapri(amicizia, utenteId, ricevente, evento, adesso);
		}
		return risposta(amicizia, ricevente);
	}

	@Transactional(readOnly = true)
	public List<AmiciziaResponse> amici(UUID utenteId) {
		return risposte(amiciziaRepository.trovaAmici(utenteId), utenteId, StatoAmiciziaVista.AMICI).stream()
				.sorted(PER_NOME_DELL_AMICO)
				.toList();
	}

	@Transactional(readOnly = true)
	public List<AmiciziaResponse> richiesteRicevute(UUID utenteId) {
		return risposte(amiciziaRepository.trovaRicevute(utenteId), utenteId, StatoAmiciziaVista.RICEVUTA);
	}

	// Comprese le RIFIUTATA mascherate: per chi e' stato respinto restano "inviate" (D7).
	@Transactional(readOnly = true)
	public List<AmiciziaResponse> richiesteInviate(UUID utenteId) {
		return risposte(amiciziaRepository.trovaInviate(utenteId), utenteId, StatoAmiciziaVista.INVIATA);
	}

	/**
	 * statoAmicizia di chi chiede verso ognuno degli altri utenti, con una sola query sulle amicizie
	 * (sezioni 7 e 18). La mappa ha una voce per ogni utente di altri, chiave il suo id.
	 * Chi chiede non va passato fra gli altri.
	 */
	@Transactional(readOnly = true)
	public Map<UUID, RelazioneAmicizia> relazioni(UUID utenteId, Collection<Utente> altri) {
		if (altri.isEmpty()) {
			return Map.of();
		}
		List<UUID> altriId = altri.stream().map(Utente::getId).toList();
		Map<UUID, AmiciziaConChat> perAltroUtente = amiciziaRepository.trovaFraUtenteEAltri(utenteId, altriId)
				.stream()
				.collect(Collectors.toMap(r -> idAltroUtente(r.amicizia(), utenteId), Function.identity()));

		Map<UUID, RelazioneAmicizia> relazioni = new HashMap<>();
		for (Utente altro : altri) {
			relazioni.put(altro.getId(), relazione(perAltroUtente.get(altro.getId()), utenteId,
					altro.getStato() == StatoUtente.ATTIVO));
		}
		return relazioni;
	}

	@Transactional
	public AmiciziaResponse accetta(UUID amiciziaId, UUID utenteId) {
		Amicizia amicizia = caricaConLock(amiciziaId, utenteId);
		if (!amicizia.getRicevente().getId().equals(utenteId)) {
			throw new ApplicazioneException(CodiceErrore.NON_RICEVENTE,
					"Solo chi ha ricevuto la richiesta puo' accettarla");
		}
		richiediPendente(amicizia);
		Utente richiedente = amicizia.getRichiedente();
		if (richiedente.getStato() != StatoUtente.ATTIVO) {
			throw new ApplicazioneException(CodiceErrore.UTENTE_NON_ATTIVO, "L'utente non e' piu' attivo");
		}

		amicizia.setStato(StatoAmicizia.ACCETTATA);
		amicizia.setAggiornataIl(clock.instant());
		// La chat della coppia si riusa, con lo storico, se esiste gia' (es. dopo una rimozione).
		UUID chatId = chatRepository.trovaIdPerAmicizia(amicizia.getId())
				.orElseGet(() -> creaChat(amicizia));
		segnaLetteRichieste(amicizia);
		notificheService.notificaAmiciziaAccettata(amicizia);
		return AmiciziaResponse.da(amicizia, richiedente, StatoAmiciziaVista.AMICI, chatId);
	}

	@Transactional
	public void rifiuta(UUID amiciziaId, UUID utenteId) {
		Amicizia amicizia = caricaConLock(amiciziaId, utenteId);
		if (!amicizia.getRicevente().getId().equals(utenteId)) {
			throw new ApplicazioneException(CodiceErrore.NON_RICEVENTE,
					"Solo chi ha ricevuto la richiesta puo' rifiutarla");
		}
		richiediPendente(amicizia);

		// Rifiuto silenzioso (D7): il richiedente continua a vedere la richiesta come inviata.
		amicizia.setStato(StatoAmicizia.RIFIUTATA);
		amicizia.setChiusaDa(amicizia.getRicevente());
		amicizia.setRichiestaMascherata(true);
		amicizia.setAggiornataIl(clock.instant());
		segnaLetteRichieste(amicizia);
	}

	@Transactional
	public void ritira(UUID amiciziaId, UUID utenteId) {
		Amicizia amicizia = caricaConLock(amiciziaId, utenteId);
		if (!amicizia.getRichiedente().getId().equals(utenteId)) {
			throw new ApplicazioneException(CodiceErrore.NON_RICHIEDENTE,
					"Solo chi ha inviato la richiesta puo' ritirarla");
		}

		if (amicizia.getStato() == StatoAmicizia.PENDENTE) {
			// La coppia torna neutra: tutti e due possono chiedere di nuovo.
			amicizia.setStato(StatoAmicizia.RITIRATA);
			notificaAmiciziaRepository.deleteByAmiciziaIdAndDestinatarioIdAndTipo(amicizia.getId(),
					amicizia.getRicevente().getId(), TipoNotificaAmicizia.RICHIESTA);
		} else if (amicizia.getStato() == StatoAmicizia.RIFIUTATA && amicizia.isRichiestaMascherata()) {
			// Per chi ritira la richiesta e' ritirata, il rifiuto resta.
			amicizia.setRichiestaMascherata(false);
		} else {
			throw nonInAttesa();
		}
		amicizia.setAggiornataIl(clock.instant());
	}

	@Transactional
	public void rimuovi(UUID amiciziaId, UUID utenteId) {
		Amicizia amicizia = caricaConLock(amiciziaId, utenteId);
		if (amicizia.getStato() != StatoAmicizia.ACCETTATA) {
			throw new ApplicazioneException(CodiceErrore.NON_AMICI, "Non siete amici");
		}

		// La chat resta, in sola lettura; solo chi rimuove puo' chiedere di nuovo l'amicizia (D8).
		amicizia.setStato(StatoAmicizia.RIMOSSA);
		amicizia.setChiusaDa(utenteRepository.getReferenceById(utenteId));
		amicizia.setAggiornataIl(clock.instant());
	}

	// Tabella "statoAmicizia: come la vede X nei confronti di Y" della sezione 8; X e' chi chiede.
	private RelazioneAmicizia relazione(AmiciziaConChat riga, UUID utenteId, boolean altroAttivo) {
		StatoAmiciziaVista stato = riga == null
				? StatoAmiciziaVista.NESSUNA
				: statoVisto(riga.amicizia(), utenteId);
		// Se Y non e' ATTIVO, tutto tranne AMICI diventa NON_DISPONIBILE.
		if (!altroAttivo && stato != StatoAmiciziaVista.AMICI) {
			return RelazioneAmicizia.NON_DISPONIBILE;
		}
		return switch (stato) {
			case INVIATA, RICEVUTA, AMICI -> new RelazioneAmicizia(stato, riga.amicizia().getId(), riga.chatId());
			case NESSUNA -> RelazioneAmicizia.NESSUNA;
			case NON_DISPONIBILE -> RelazioneAmicizia.NON_DISPONIBILE;
		};
	}

	private StatoAmiciziaVista statoVisto(Amicizia amicizia, UUID utenteId) {
		boolean chiusaDaMe = amicizia.getChiusaDa() != null && amicizia.getChiusaDa().getId().equals(utenteId);
		return switch (amicizia.getStato()) {
			case PENDENTE -> amicizia.getRichiedente().getId().equals(utenteId)
					? StatoAmiciziaVista.INVIATA
					: StatoAmiciziaVista.RICEVUTA;
			case ACCETTATA -> StatoAmiciziaVista.AMICI;
			case RITIRATA -> StatoAmiciziaVista.NESSUNA;
			// Chiusa da me: posso riaprire. Chiusa dall'altro: mascherata = il rifiuto non si vede (D7),
			// non mascherata = ho ritirato io la richiesta.
			case RIFIUTATA -> !chiusaDaMe && amicizia.isRichiestaMascherata()
					? StatoAmiciziaVista.INVIATA
					: StatoAmiciziaVista.NESSUNA;
			case RIMOSSA -> chiusaDaMe ? StatoAmiciziaVista.NESSUNA : StatoAmiciziaVista.NON_DISPONIBILE;
		};
	}

	// Le liste: l'altro utente e' gia' caricato dalla query, le chat si leggono tutte insieme.
	private List<AmiciziaResponse> risposte(List<Amicizia> amicizie, UUID utenteId, StatoAmiciziaVista stato) {
		if (amicizie.isEmpty()) {
			return List.of();
		}
		Map<UUID, UUID> chatPerAmicizia = chatRepository
				.findByAmiciziaIdIn(amicizie.stream().map(Amicizia::getId).toList()).stream()
				.collect(Collectors.toMap(c -> c.getAmicizia().getId(), Chat::getId));
		return amicizie.stream()
				.map(a -> AmiciziaResponse.da(a, altroUtente(a, utenteId), stato, chatPerAmicizia.get(a.getId())))
				.toList();
	}

	private Utente altroUtente(Amicizia amicizia, UUID utenteId) {
		return amicizia.getRichiedente().getId().equals(utenteId) ? amicizia.getRicevente() : amicizia.getRichiedente();
	}

	private UUID idAltroUtente(Amicizia amicizia, UUID utenteId) {
		return altroUtente(amicizia, utenteId).getId();
	}

	// 404 anche se l'amicizia esiste ma non riguarda chi chiede (sezione 8).
	private Amicizia caricaConLock(UUID amiciziaId, UUID utenteId) {
		return amiciziaRepository.findConLockById(amiciziaId)
				.filter(a -> a.getRichiedente().getId().equals(utenteId)
						|| a.getRicevente().getId().equals(utenteId))
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Amicizia non trovata"));
	}

	private void richiediPendente(Amicizia amicizia) {
		if (amicizia.getStato() != StatoAmicizia.PENDENTE) {
			throw nonInAttesa();
		}
	}

	private ApplicazioneException nonInAttesa() {
		return new ApplicazioneException(CodiceErrore.NON_IN_ATTESA, "La richiesta non e' piu' in attesa");
	}

	private UUID creaChat(Amicizia amicizia) {
		Chat chat = new Chat();
		chat.setAmicizia(amicizia);
		chat.setCreataIl(clock.instant());
		return chatRepository.save(chat).getId();
	}

	// Segnare lette le RICHIESTA quando si accetta o si rifiuta e' a carico delle amicizie (TEAM-02).
	private void segnaLetteRichieste(Amicizia amicizia) {
		notificaAmiciziaRepository
				.findByAmiciziaIdAndTipoAndLettaFalse(amicizia.getId(), TipoNotificaAmicizia.RICHIESTA)
				.forEach(n -> n.setLetta(true));
	}

	// Il proprietario dell'evento conta come se avesse il ticket (D6).
	private boolean haTicketOProprietario(Evento evento, UUID utenteId) {
		return evento.getProprietario().getId().equals(utenteId)
				|| partecipanteRepository.existsByEventoIdAndUtenteId(evento.getId(), utenteId);
	}

	// Riga riusata: PENDENTE da chi chiede, con richiedente, ricevente ed evento aggiornati (sezione 8).
	private void riapri(Amicizia amicizia, UUID utenteId, Utente ricevente, Evento evento, Instant adesso) {
		apri(amicizia, utenteId, ricevente, evento, adesso);
		notificheService.notificaRichiestaAmicizia(amicizia);
	}

	private void apri(Amicizia amicizia, UUID utenteId, Utente ricevente, Evento evento, Instant adesso) {
		amicizia.setRichiedente(utenteRepository.getReferenceById(utenteId));
		amicizia.setRicevente(ricevente);
		amicizia.setEvento(evento);
		amicizia.setStato(StatoAmicizia.PENDENTE);
		amicizia.setChiusaDa(null);
		amicizia.setRichiestaMascherata(false);
		amicizia.setAggiornataIl(adesso);
	}

	private AmiciziaResponse risposta(Amicizia amicizia, Utente ricevente) {
		UUID chatId = chatRepository.trovaIdPerAmicizia(amicizia.getId()).orElse(null);
		return AmiciziaResponse.da(amicizia, ricevente, StatoAmiciziaVista.INVIATA, chatId);
	}
}
