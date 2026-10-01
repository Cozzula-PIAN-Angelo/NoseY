package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.Haversine;
import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.notification.ParteEvento;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * CreaPOI, ListaPOI, ModificaPOI, CancellaPOI (progettazione v4, sezione 5).
 */
@Service
@RequiredArgsConstructor
public class PoiService {

	private static final int LIMITE_POI = 15;
	private static final double RAGGIO_POI_KM = 2.0;

	private final EventoRepository eventoRepository;
	private final PoiRepository poiRepository;
	private final NotificheService notificheService;
	private final Clock clock;

	@Transactional(readOnly = true)
	public List<PoiResponse> lista(UUID eventoId) {
		if (!eventoRepository.existsById(eventoId)) {
			throw new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato");
		}
		return poiRepository.findByEventoId(eventoId).stream().map(PoiResponse::da).toList();
	}

	@Transactional
	public PoiResponse crea(UUID eventoId, UUID proprietarioId, PoiRequest richiesta) {
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		StatoEvento.controllaScrivibile(evento, clock.instant());

		long numeroPoi = poiRepository.countByEventoId(evento.getId());
		if (numeroPoi >= LIMITE_POI) {
			throw new ApplicazioneException(CodiceErrore.LIMITE_POI, "L'evento ha gia' 15 POI");
		}
		if (Haversine.km(richiesta.lat(), richiesta.lng(), evento.getLat(), evento.getLng()) > RAGGIO_POI_KM) {
			throw new ApplicazioneException(CodiceErrore.POI_TROPPO_LONTANO, "Il POI e' a piu' di 2 km dall'evento");
		}

		Poi poi = new Poi();
		poi.setEvento(evento);
		poi.setTipo(richiesta.tipo());
		poi.setLat(richiesta.lat());
		poi.setLng(richiesta.lng());
		poi.setEtichetta(richiesta.etichetta() == null || richiesta.etichetta().isBlank()
				? null : richiesta.etichetta().strip());
		poi.setCreatoIl(clock.instant());
		poiRepository.save(poi);

		notificheService.notificaModifica(evento, Set.of(ParteEvento.MAPPA_INTERNA));
		return PoiResponse.da(poi);
	}

	@Transactional
	public PoiResponse modifica(UUID eventoId, UUID poiId, UUID proprietarioId, ModificaPoiRequest richiesta) {
		if (richiesta.vuota()) {
			throw new ApplicazioneException(CodiceErrore.RICHIESTA_VUOTA, "Nessun campo da modificare");
		}
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		Poi poi = poiRepository.findByIdAndEventoId(poiId, eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "POI non trovato"));
		StatoEvento.controllaScrivibile(evento, clock.instant());

		boolean cambiato = false;
		if (richiesta.tipo() != null && richiesta.tipo() != poi.getTipo()) {
			poi.setTipo(richiesta.tipo());
			cambiato = true;
		}

		boolean latCambiata = richiesta.lat() != null && !richiesta.lat().equals(poi.getLat());
		boolean lngCambiata = richiesta.lng() != null && !richiesta.lng().equals(poi.getLng());
		if (latCambiata || lngCambiata) {
			double nuovaLat = latCambiata ? richiesta.lat() : poi.getLat();
			double nuovaLng = lngCambiata ? richiesta.lng() : poi.getLng();
			if (Haversine.km(nuovaLat, nuovaLng, evento.getLat(), evento.getLng()) > RAGGIO_POI_KM) {
				throw new ApplicazioneException(CodiceErrore.POI_TROPPO_LONTANO, "Il POI e' a piu' di 2 km dall'evento");
			}
			poi.setLat(nuovaLat);
			poi.setLng(nuovaLng);
			cambiato = true;
		}

		if (richiesta.etichetta() != null) {
			String nuovaEtichetta = richiesta.etichetta().isEmpty() ? null : richiesta.etichetta().strip();
			if (!Objects.equals(nuovaEtichetta, poi.getEtichetta())) {
				poi.setEtichetta(nuovaEtichetta);
				cambiato = true;
			}
		}

		if (cambiato) {
			notificheService.notificaModifica(evento, Set.of(ParteEvento.MAPPA_INTERNA));
		}
		return PoiResponse.da(poi);
	}

	@Transactional
	public void cancella(UUID eventoId, UUID poiId, UUID proprietarioId) {
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		Poi poi = poiRepository.findByIdAndEventoId(poiId, eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "POI non trovato"));
		StatoEvento.controllaScrivibile(evento, clock.instant());

		poiRepository.delete(poi);
		notificheService.notificaModifica(evento, Set.of(ParteEvento.MAPPA_INTERNA));
	}
}
