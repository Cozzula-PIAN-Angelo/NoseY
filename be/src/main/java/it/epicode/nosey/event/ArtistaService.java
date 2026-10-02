package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.ImmagineContenuto;
import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.notification.ParteEvento;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * ListaArtisti, VediArtista, AggiungiArtistaEvento, RimuoviArtistaEvento (progettazione v4, sezione 6).
 * Creazione/modifica/disattivazione/eliminazione degli artisti: solo ADMIN (sezione 12, non qui).
 */
@Service
@RequiredArgsConstructor
public class ArtistaService {

	private final ArtistaRepository artistaRepository;
	private final EventoRepository eventoRepository;
	private final ArtistaEventoRepository artistaEventoRepository;
	private final FotoEventoRepository fotoEventoRepository;
	private final NotificheService notificheService;
	private final Clock clock;

	@Transactional(readOnly = true)
	public List<ArtistaResponse> lista(String search) {
		List<Artista> artisti = (search == null || search.isBlank())
				? artistaRepository.findByAttivoTrueOrderByNomeAsc()
				: artistaRepository.findByAttivoTrueAndNomeContainingIgnoreCaseOrderByNomeAsc(search.strip());
		return artisti.stream().map(ArtistaResponse::da).toList();
	}

	// Anche disattivato: resta visibile negli eventi in cui compare (sezione 6).
	@Transactional(readOnly = true)
	public ArtistaResponse vedi(UUID artistaId) {
		return ArtistaResponse.da(trovaArtista(artistaId));
	}

	@Transactional
	public ArtistaResponse aggiungiAEvento(UUID eventoId, UUID artistaId, UUID proprietarioId) {
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		Artista artista = trovaArtista(artistaId);
		StatoEvento.controllaScrivibile(evento, clock.instant());

		if (!artista.isAttivo()) {
			throw new ApplicazioneException(CodiceErrore.ARTISTA_NON_ATTIVO, "L'artista non e' attivo");
		}
		if (artistaEventoRepository.existsByEventoIdAndArtistaId(eventoId, artistaId)) {
			throw new ApplicazioneException(CodiceErrore.ARTISTA_GIA_ASSOCIATO, "Artista gia' associato all'evento");
		}
		// Un doppio clic che supera comunque il controllo sopra finisce sul vincolo pk_artista_evento,
		// che GestoreErrori converte nello stesso 409 ARTISTA_GIA_ASSOCIATO (mai un 500).
		ArtistaEvento artistaEvento = new ArtistaEvento();
		artistaEvento.setEvento(evento);
		artistaEvento.setArtista(artista);
		artistaEventoRepository.save(artistaEvento);

		notificheService.notificaModifica(evento, Set.of(ParteEvento.ARTISTI));
		return ArtistaResponse.da(artista);
	}

	@Transactional
	public void rimuoviDaEvento(UUID eventoId, UUID artistaId, UUID proprietarioId) {
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		if (!artistaEventoRepository.existsByEventoIdAndArtistaId(eventoId, artistaId)) {
			throw new ApplicazioneException(CodiceErrore.NON_TROVATO, "Artista non associato all'evento");
		}
		StatoEvento.controllaScrivibile(evento, clock.instant());

		artistaEventoRepository.deleteById(new ArtistaEventoId(eventoId, artistaId));
		notificheService.notificaModifica(evento, Set.of(ParteEvento.ARTISTI));
	}

	// Pubblico (decisione 9): un tag img non puo' mandare il token.
	@Transactional(readOnly = true)
	public ImmagineContenuto immagine(UUID artistaId) {
		// Il filtro usa la versione: i byte (campo LAZY) si leggono solo se l'immagine c'e'.
		Artista artista = trovaArtista(artistaId);
		if (artista.getImmagineVersione() == null) {
			throw new ApplicazioneException(CodiceErrore.NON_TROVATO, "Immagine non trovata");
		}
		return new ImmagineContenuto(artista.getImmagine(), artista.getImmagineContentType(),
				artista.getImmagineVersione());
	}

	// EventiArtista (sezione 6): eventi PROGRAMMATO e IN_CORSO dove suona l'artista, per dataEvento
	// crescente. Vale anche per gli artisti disattivati (restano negli eventi in cui compaiono).
	@Transactional(readOnly = true)
	public List<EventoMappaResponse> eventi(UUID artistaId) {
		if (!artistaRepository.existsById(artistaId)) {
			throw new ApplicazioneException(CodiceErrore.NON_TROVATO, "Artista non trovato");
		}
		Instant adesso = clock.instant();
		List<Evento> eventi = eventoRepository
				.findByArtistaIdAndStatoAndDataFineGreaterThanEqual(artistaId, StatoEventoDb.PROGRAMMATO, adesso);
		if (eventi.isEmpty()) {
			return List.of();
		}
		List<UUID> ids = eventi.stream().map(Evento::getId).toList();
		Map<UUID, FotoEvento> copertine = fotoEventoRepository.findByEventoIdInAndCopertinaTrue(ids).stream()
				.collect(Collectors.toMap(foto -> foto.getEvento().getId(), Function.identity()));
		return eventi.stream()
				.map(evento -> EventoMappaResponse.da(evento, copertine.get(evento.getId()), null, adesso))
				.toList();
	}

	private Artista trovaArtista(UUID artistaId) {
		return artistaRepository.findById(artistaId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Artista non trovato"));
	}
}
