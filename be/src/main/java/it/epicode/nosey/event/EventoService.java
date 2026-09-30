package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.ImmagineContenuto;
import it.epicode.nosey.ticket.PartecipanteRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtentePubblicoResponse;
import it.epicode.nosey.user.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * ListaEventiMappa, CreaEvento e VediEvento (progettazione v4, sezione 3).
 */
@Service
@RequiredArgsConstructor
public class EventoService {

	// Raggio medio della Terra: precisione sufficiente per ordinare gli eventi (non per navigare).
	private static final double RAGGIO_TERRA_KM = 6371.0;

	private final EventoRepository eventoRepository;
	private final UtenteRepository utenteRepository;
	private final FotoEventoRepository fotoEventoRepository;
	private final ArtistaEventoRepository artistaEventoRepository;
	private final PoiRepository poiRepository;
	private final PartecipanteRepository partecipanteRepository;
	private final Clock clock;

	@Transactional(readOnly = true)
	public List<EventoMappaResponse> listaMappa(Double lat, Double lng) {
		if ((lat == null) != (lng == null)) {
			throw new ApplicazioneException(CodiceErrore.VALIDAZIONE, "lat e lng vanno passati insieme o nessuno dei due");
		}
		Instant adesso = clock.instant();
		List<Evento> eventi = eventoRepository
				.findByStatoAndDataFineGreaterThanEqualOrderByDataEventoAsc(StatoEventoDb.PROGRAMMATO, adesso);
		Map<UUID, FotoEvento> copertine = copertine(eventi);

		if (lat == null) {
			// Senza posizione: l'ordine per dataEvento crescente arriva gia' dalla query.
			return eventi.stream()
					.map(evento -> EventoMappaResponse.da(evento, copertine.get(evento.getId()), null, adesso))
					.toList();
		}
		// Con la posizione: per distanza crescente (Haversine). La posizione cambia solo
		// l'ordine, mai il numero di eventi restituiti (requisito della traccia).
		return eventi.stream()
				.map(evento -> EventoMappaResponse.da(evento, copertine.get(evento.getId()),
						distanzaKm(lat, lng, evento.getLat(), evento.getLng()), adesso))
				.sorted(Comparator.comparingDouble(EventoMappaResponse::distanzaKm))
				.toList();
	}

	/**
	 * Le copertine di tutti gli eventi con una sola query, non una per evento. I byte delle
	 * foto non si leggono (campo LAZY): per l'URL basta la versione.
	 */
	private Map<UUID, FotoEvento> copertine(List<Evento> eventi) {
		if (eventi.isEmpty()) {
			return Map.of();
		}
		List<UUID> ids = eventi.stream().map(Evento::getId).toList();
		// getEvento().getId() non carica l'evento: l'id del proxy e' gia' noto.
		return fotoEventoRepository.findByEventoIdInAndCopertinaTrue(ids).stream()
				.collect(Collectors.toMap(foto -> foto.getEvento().getId(), Function.identity()));
	}

	// Pubblico (decisione 9): un tag img non puo' mandare il token.
	@Transactional(readOnly = true)
	public ImmagineContenuto immagineFoto(UUID eventoId, UUID fotoId) {
		FotoEvento foto = fotoEventoRepository.findByIdAndEventoId(fotoId, eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Foto non trovata"));
		return new ImmagineContenuto(foto.getContenuto(), foto.getContentType(), foto.getVersione());
	}

	private double distanzaKm(double lat1, double lng1, double lat2, double lng2) {
		double dLat = Math.toRadians(lat2 - lat1);
		double dLng = Math.toRadians(lng2 - lng1);
		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
				* Math.sin(dLng / 2) * Math.sin(dLng / 2);
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return RAGGIO_TERRA_KM * c;
	}

	@Transactional
	public EventoDettaglioResponse crea(EventoRequest richiesta, UUID proprietarioId) {
		if (!richiesta.dataFine().isAfter(richiesta.dataEvento())) {
			throw new ApplicazioneException(CodiceErrore.DATE_NON_VALIDE,
					"La data di fine deve essere successiva alla data dell'evento");
		}
		Utente proprietario = utenteRepository.findById(proprietarioId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Utente non trovato"));

		Evento evento = new Evento();
		evento.setProprietario(proprietario);
		evento.setTitolo(richiesta.titolo().strip());
		evento.setDescrizione(richiesta.descrizione() == null ? null : richiesta.descrizione().strip());
		evento.setDataEvento(richiesta.dataEvento());
		evento.setDataFine(richiesta.dataFine());
		evento.setLat(richiesta.lat());
		evento.setLng(richiesta.lng());
		evento.setStato(StatoEventoDb.PROGRAMMATO);
		evento.setCreatoIl(clock.instant());
		eventoRepository.save(evento);

		return dettaglio(evento, proprietarioId, false);
	}

	@Transactional(readOnly = true)
	public EventoDettaglioResponse vedi(UUID id, UUID richiedenteId) {
		Evento evento = eventoRepository.findById(id)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		boolean sonoIscritto = richiedenteId != null
				&& partecipanteRepository.existsByEventoIdAndUtenteId(evento.getId(), richiedenteId);
		return dettaglio(evento, richiedenteId, sonoIscritto);
	}

	// Foto, artisti e POI con query separate: un fetch join su piu' List nella
	// stessa query darebbe MultipleBagFetchException (progettazione v4, sezione 18).
	private EventoDettaglioResponse dettaglio(Evento evento, UUID richiedenteId, boolean sonoIscritto) {
		List<FotoResponse> foto = fotoEventoRepository.findByEventoIdOrderByCopertinaDescCaricataIlAsc(evento.getId())
				.stream().map(f -> FotoResponse.da(evento.getId(), f)).toList();
		List<ArtistaResponse> artisti = artistaEventoRepository.findArtistiOrdinatiByEventoId(evento.getId())
				.stream().map(ArtistaResponse::da).toList();
		List<PoiResponse> poi = poiRepository.findByEventoId(evento.getId())
				.stream().map(PoiResponse::da).toList();
		long numeroPartecipanti = partecipanteRepository.countByEventoId(evento.getId());
		boolean sonoProprietario = richiedenteId != null && evento.getProprietario().getId().equals(richiedenteId);

		return new EventoDettaglioResponse(
				evento.getId(),
				evento.getTitolo(),
				evento.getDescrizione(),
				evento.getDataEvento(),
				evento.getDataFine(),
				StatoEvento.calcola(evento, clock.instant()),
				evento.getMotivoAnnullamento(),
				evento.getLat(),
				evento.getLng(),
				UtentePubblicoResponse.da(evento.getProprietario()),
				foto,
				artisti,
				poi,
				numeroPartecipanti,
				sonoProprietario,
				sonoIscritto);
	}
}
