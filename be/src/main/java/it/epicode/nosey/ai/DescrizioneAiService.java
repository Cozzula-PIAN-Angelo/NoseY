package it.epicode.nosey.ai;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.Limite;
import it.epicode.nosey.common.LimitiService;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.event.FotoEvento;
import it.epicode.nosey.event.FotoEventoRepository;
import it.epicode.nosey.event.StatoEvento;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.util.UUID;

/**
 * MiglioraDescrizioneAI (progettazione v4, sezione 3). Non salva niente: la proposta si conferma
 * con ModificaEvento { descrizione }.
 *
 * Il database si legge in una transazione di sola lettura che si chiude PRIMA della chiamata a
 * Gemini (fino a decine di secondi): niente connessione del pool occupata durante l'attesa.
 */
@Service
public class DescrizioneAiService {

	private final EventoRepository eventoRepository;
	private final FotoEventoRepository fotoEventoRepository;
	private final LimitiService limitiService;
	private final ProviderAi providerAi;
	private final Clock clock;
	private final TransactionTemplate solaLettura;

	public DescrizioneAiService(EventoRepository eventoRepository, FotoEventoRepository fotoEventoRepository,
			LimitiService limitiService, ProviderAi providerAi, Clock clock,
			PlatformTransactionManager transactionManager) {
		this.eventoRepository = eventoRepository;
		this.fotoEventoRepository = fotoEventoRepository;
		this.limitiService = limitiService;
		this.providerAi = providerAi;
		this.clock = clock;
		this.solaLettura = new TransactionTemplate(transactionManager);
		this.solaLettura.setReadOnly(true);
	}

	public DescrizionePropostaResponse migliora(UUID eventoId, UUID utenteId, MiglioraDescrizioneRequest richiesta) {
		// 429 subito dopo la validazione del DTO, prima dei 404/403 (sezione 0):
		// il tentativo conta anche se poi la richiesta fallisce.
		limitiService.consuma(Limite.AI, utenteId.toString());

		DatiPerAi dati = solaLettura.execute(stato -> leggi(eventoId, utenteId, richiesta));
		String proposta = providerAi.migliora(dati.immagine(), dati.contentType(), dati.descrizione());
		return new DescrizionePropostaResponse(proposta);
	}

	// Controlli nell'ordine della sezione 3: evento, proprietario, foto, stato, descrizione.
	private DatiPerAi leggi(UUID eventoId, UUID utenteId, MiglioraDescrizioneRequest richiesta) {
		Evento evento = eventoRepository.findById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (!evento.getProprietario().getId().equals(utenteId)) {
			throw new ApplicazioneException(CodiceErrore.NON_PROPRIETARIO, "Non sei il proprietario dell'evento");
		}
		// Foto inesistente o di un altro evento: tutte e due 404.
		FotoEvento foto = fotoEventoRepository.findByIdAndEventoId(richiesta.fotoId(), eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Foto non trovata"));
		StatoEvento.controllaScrivibile(evento, clock.instant());

		String descrizione = richiesta.descrizione() == null || richiesta.descrizione().isEmpty()
				? evento.getDescrizione()
				: richiesta.descrizione();
		if (descrizione == null || descrizione.isBlank()) {
			throw new ApplicazioneException(CodiceErrore.DESCRIZIONE_MANCANTE,
					"Scrivi una descrizione da migliorare");
		}
		// getContenuto() dentro la transazione: i byte sono LAZY.
		return new DatiPerAi(foto.getContenuto(), foto.getContentType(), descrizione.strip());
	}

	private record DatiPerAi(byte[] immagine, String contentType, String descrizione) {
	}
}
