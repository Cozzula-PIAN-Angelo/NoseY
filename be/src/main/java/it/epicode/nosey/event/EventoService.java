package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.ticket.PartecipanteRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtentePubblicoResponse;
import it.epicode.nosey.user.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * CreaEvento e VediEvento (progettazione v4, sezione 3).
 */
@Service
@RequiredArgsConstructor
public class EventoService {

	private final EventoRepository eventoRepository;
	private final UtenteRepository utenteRepository;
	private final FotoEventoRepository fotoEventoRepository;
	private final ArtistaEventoRepository artistaEventoRepository;
	private final PoiRepository poiRepository;
	private final PartecipanteRepository partecipanteRepository;
	private final Clock clock;

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
				.stream().map(FotoResponse::da).toList();
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
				calcolaStato(evento),
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

	// PROGRAMMATO/ANNULLATO stanno nel DB; IN_CORSO e CONCLUSO si calcolano dalle date
	// (progettazione v4, sezione 0 "Stato dell'evento"): niente job che li tenga aggiornati.
	private StatoEvento calcolaStato(Evento evento) {
		if (evento.getStato() == StatoEventoDb.ANNULLATO) {
			return StatoEvento.ANNULLATO;
		}
		Instant adesso = clock.instant();
		if (adesso.isBefore(evento.getDataEvento())) {
			return StatoEvento.PROGRAMMATO;
		}
		if (!adesso.isAfter(evento.getDataFine())) {
			return StatoEvento.IN_CORSO;
		}
		return StatoEvento.CONCLUSO;
	}
}
