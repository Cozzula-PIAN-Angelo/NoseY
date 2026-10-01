package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.ImmagineContenuto;
import it.epicode.nosey.common.ImmagineValidata;
import it.epicode.nosey.common.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

/**
 * CreaFoto, ListaFoto, ModificaFoto, CancellaFoto (progettazione v4, sezione 4).
 * Immagini nel database (decisione 4): niente upload/cancellazione su uno storage esterno,
 * salvare o cancellare il byte[] e' la stessa scrittura sul DB di qualunque altro campo.
 */
@Service
@RequiredArgsConstructor
public class FotoService {

	private static final long DIMENSIONE_MASSIMA_BYTE = 5L * 1024 * 1024; // 5 MB (sezione 4)
	private static final int LIMITE_FOTO = 10;

	private final EventoRepository eventoRepository;
	private final FotoEventoRepository fotoEventoRepository;
	private final StorageService storageService;
	private final Clock clock;

	@Transactional(readOnly = true)
	public List<FotoResponse> lista(UUID eventoId) {
		Evento evento = trovaEvento(eventoId);
		return fotoEventoRepository.findByEventoIdOrderByCopertinaDescCaricataIlAsc(evento.getId())
				.stream().map(f -> FotoResponse.da(evento.getId(), f)).toList();
	}

	@Transactional
	public FotoResponse crea(UUID eventoId, UUID proprietarioId, MultipartFile file, String didascalia) {
		// Il file fa parte della validazione: si controlla prima di tutto (sezione 0 "Upload").
		ImmagineValidata immagine = storageService.valida(file, DIMENSIONE_MASSIMA_BYTE);

		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		StatoEvento.controllaScrivibile(evento, clock.instant());

		long numeroFoto = fotoEventoRepository.countByEventoId(evento.getId());
		if (numeroFoto >= LIMITE_FOTO) {
			throw new ApplicazioneException(CodiceErrore.LIMITE_FOTO, "L'evento ha gia' 10 foto");
		}

		FotoEvento foto = new FotoEvento();
		foto.setEvento(evento);
		foto.setContenuto(immagine.contenuto());
		foto.setContentType(immagine.contentType());
		foto.setDidascalia(didascalia == null || didascalia.isBlank() ? null : didascalia.strip());
		// Grazie al lock, piu' foto caricate insieme su un evento nuovo non diventano tutte copertina.
		foto.setCopertina(numeroFoto == 0);
		foto.setCaricataIl(clock.instant());
		fotoEventoRepository.save(foto);

		return FotoResponse.da(evento.getId(), foto);
	}

	@Transactional
	public FotoResponse modifica(UUID eventoId, UUID fotoId, UUID proprietarioId, ModificaFotoRequest richiesta) {
		if (richiesta.vuota()) {
			throw new ApplicazioneException(CodiceErrore.RICHIESTA_VUOTA, "Nessun campo da modificare");
		}
		if (Boolean.FALSE.equals(richiesta.copertina())) {
			throw new ApplicazioneException(CodiceErrore.COPERTINA_NON_VALIDA, "copertina puo' essere solo true");
		}
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		FotoEvento foto = fotoEventoRepository.findByIdAndEventoId(fotoId, eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Foto non trovata"));
		StatoEvento.controllaScrivibile(evento, clock.instant());

		if (richiesta.didascalia() != null) {
			foto.setDidascalia(richiesta.didascalia().isEmpty() ? null : richiesta.didascalia().strip());
		}
		if (Boolean.TRUE.equals(richiesta.copertina()) && !foto.isCopertina()) {
			// 1. toglie la copertina attuale (SUBITO, prima di toccare la foto scelta)
			fotoEventoRepository.azzeraCopertina(evento.getId());
			// 2. la foto scelta diventa la copertina
			foto.setCopertina(true);
		}
		return FotoResponse.da(evento.getId(), foto);
	}

	@Transactional
	public void cancella(UUID eventoId, UUID fotoId, UUID proprietarioId) {
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(proprietarioId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		FotoEvento foto = fotoEventoRepository.findByIdAndEventoId(fotoId, eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Foto non trovata"));
		StatoEvento.controllaScrivibile(evento, clock.instant());

		boolean eraCopertina = foto.isCopertina();
		// flush() subito: senza, Hibernate eseguirebbe questa DELETE per ultima (dopo gli UPDATE),
		// e la nuova copertina verrebbe scritta prima della cancellazione (sezione 4).
		fotoEventoRepository.delete(foto);
		fotoEventoRepository.flush();

		if (eraCopertina) {
			fotoEventoRepository.findFirstByEventoIdOrderByCaricataIlAsc(evento.getId())
					.ifPresent(rimasta -> rimasta.setCopertina(true));
		}
	}

	// Pubblico (decisione 9): un tag img non puo' mandare il token.
	@Transactional(readOnly = true)
	public ImmagineContenuto immagine(UUID eventoId, UUID fotoId) {
		FotoEvento foto = fotoEventoRepository.findByIdAndEventoId(fotoId, eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Foto non trovata"));
		return new ImmagineContenuto(foto.getContenuto(), foto.getContentType(), foto.getVersione());
	}

	private Evento trovaEvento(UUID id) {
		return eventoRepository.findById(id)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
	}
}
