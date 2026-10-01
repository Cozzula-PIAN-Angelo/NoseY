package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.notification.ParteEvento;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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
	private final NotificheService notificheService;
	private final Clock clock;

	private static final double RAGGIO_POI_KM = 2.0;

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

	@Transactional(readOnly = true)
	public List<EventoMappaResponse> mieiEventi(UUID proprietarioId) {
		// Tutti, anche conclusi e annullati, per dataEvento decrescente (sezione 2).
		// distanzaKm sempre null: chi guarda i propri eventi non ha passato una posizione.
		List<Evento> eventi = eventoRepository.findByProprietarioIdOrderByDataEventoDesc(proprietarioId);
		Map<UUID, FotoEvento> copertine = copertine(eventi);
		Instant adesso = clock.instant();
		return eventi.stream()
				.map(evento -> EventoMappaResponse.da(evento, copertine.get(evento.getId()), null, adesso))
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

	@Transactional
	public EventoDettaglioResponse modifica(UUID id, UUID proprietarioId, ModificaEventoRequest richiesta) {
		if (richiesta.vuota()) {
			throw new ApplicazioneException(CodiceErrore.RICHIESTA_VUOTA, "Nessun campo da modificare");
		}
		Evento evento = eventoRepository.findConLockById(id)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		Instant adesso = clock.instant();
		StatoEvento statoAttuale = StatoEvento.controllaScrivibile(evento, adesso);

		boolean dataEventoCambiata = richiesta.dataEvento() != null && !richiesta.dataEvento().equals(evento.getDataEvento());
		boolean dataFineCambiata = richiesta.dataFine() != null && !richiesta.dataFine().equals(evento.getDataFine());

		if (dataEventoCambiata && statoAttuale == StatoEvento.IN_CORSO) {
			throw new ApplicazioneException(CodiceErrore.EVENTO_GIA_INIZIATO, "L'evento e' gia' iniziato");
		}
		if ((dataEventoCambiata && !richiesta.dataEvento().isAfter(adesso))
				|| (dataFineCambiata && !richiesta.dataFine().isAfter(adesso))) {
			throw new ApplicazioneException(CodiceErrore.DATA_NON_FUTURA, "La data deve essere futura");
		}
		Instant nuovaDataEvento = dataEventoCambiata ? richiesta.dataEvento() : evento.getDataEvento();
		Instant nuovaDataFine = dataFineCambiata ? richiesta.dataFine() : evento.getDataFine();
		if (!nuovaDataFine.isAfter(nuovaDataEvento)) {
			throw new ApplicazioneException(CodiceErrore.DATE_NON_VALIDE,
					"La data di fine deve essere successiva alla data dell'evento");
		}

		boolean latCambiata = richiesta.lat() != null && !richiesta.lat().equals(evento.getLat());
		boolean lngCambiata = richiesta.lng() != null && !richiesta.lng().equals(evento.getLng());
		if (latCambiata || lngCambiata) {
			double nuovaLat = latCambiata ? richiesta.lat() : evento.getLat();
			double nuovaLng = lngCambiata ? richiesta.lng() : evento.getLng();
			boolean poiFuoriRaggio = poiRepository.findByEventoId(evento.getId()).stream()
					.anyMatch(poi -> distanzaKm(nuovaLat, nuovaLng, poi.getLat(), poi.getLng()) > RAGGIO_POI_KM);
			if (poiFuoriRaggio) {
				throw new ApplicazioneException(CodiceErrore.POI_FUORI_RAGGIO,
						"Un POI resterebbe a piu' di 2 km dall'evento");
			}
		}

		Set<ParteEvento> parti = new LinkedHashSet<>();
		if (richiesta.titolo() != null && !richiesta.titolo().equals(evento.getTitolo())) {
			evento.setTitolo(richiesta.titolo());
			parti.add(ParteEvento.TITOLO);
		}
		if (richiesta.descrizione() != null) {
			String nuovaDescrizione = richiesta.descrizione().isEmpty() ? null : richiesta.descrizione();
			if (!Objects.equals(nuovaDescrizione, evento.getDescrizione())) {
				evento.setDescrizione(nuovaDescrizione);
				parti.add(ParteEvento.DESCRIZIONE);
			}
		}
		if (dataEventoCambiata) {
			evento.setDataEvento(richiesta.dataEvento());
			parti.add(ParteEvento.DATE);
		}
		if (dataFineCambiata) {
			evento.setDataFine(richiesta.dataFine());
			parti.add(ParteEvento.DATE);
		}
		if (latCambiata) {
			evento.setLat(richiesta.lat());
			parti.add(ParteEvento.LUOGO);
		}
		if (lngCambiata) {
			evento.setLng(richiesta.lng());
			parti.add(ParteEvento.LUOGO);
		}

		if (!parti.isEmpty()) {
			notificheService.notificaModifica(evento, parti);
		}
		// Il proprietario non puo' essere iscritto al proprio evento (PROPRIETARIO_NON_ISCRIVIBILE).
		return dettaglio(evento, proprietarioId, false);
	}

	@Transactional
	public void annulla(UUID id, UUID proprietarioId, String motivo) {
		Evento evento = eventoRepository.findConLockById(id)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		StatoEvento.controllaScrivibile(evento, clock.instant());

		evento.setStato(StatoEventoDb.ANNULLATO);
		evento.setMotivoAnnullamento(motivo == null || motivo.isBlank() ? null : motivo.strip());
		notificheService.notificaAnnullamento(evento);
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
