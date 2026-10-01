package it.epicode.nosey.ticket;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.Limite;
import it.epicode.nosey.common.LimitiService;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.event.StatoEvento;
import it.epicode.nosey.mail.TicketEmailEvent;
import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

/**
 * IscrizioneEvento, VediMiaPartecipazione, CancellaPartecipazione (progettazione v4, sezione 7).
 */
@Service
@RequiredArgsConstructor
public class PartecipanteService {

	private final EventoRepository eventoRepository;
	private final UtenteRepository utenteRepository;
	private final PartecipanteRepository partecipanteRepository;
	private final NotificheService notificheService;
	private final LimitiService limitiService;
	private final ApplicationEventPublisher eventi;
	private final Clock clock;

	@Transactional
	public TicketResponse iscrivi(UUID eventoId, UUID utenteId) {
		// Il tentativo conta anche se la richiesta poi fallisce (docs/interfacce.md).
		limitiService.consuma(Limite.ISCRIZIONI, utenteId.toString());

		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		if (evento.getProprietario().getId().equals(utenteId)) {
			throw new ApplicazioneException(CodiceErrore.PROPRIETARIO_NON_ISCRIVIBILE,
					"Il proprietario non puo' iscriversi al proprio evento");
		}
		// Si puo' iscrivere anche a un evento IN_CORSO: PROGRAMMATO/IN_CORSO passano, il resto no.
		StatoEvento.controllaScrivibile(evento, clock.instant());

		if (partecipanteRepository.existsByEventoIdAndUtenteId(eventoId, utenteId)) {
			throw new ApplicazioneException(CodiceErrore.GIA_ISCRITTO, "Sei gia' iscritto a questo evento");
		}
		// Un doppio clic che supera comunque il controllo sopra finisce sul vincolo uq_partecipante,
		// che GestoreErrori converte nello stesso 409 GIA_ISCRITTO (mai un 500).
		Utente utente = utenteRepository.findById(utenteId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Utente non trovato"));

		Partecipante partecipante = new Partecipante();
		partecipante.setUtente(utente);
		partecipante.setEvento(evento);
		partecipante.setCodice(UUID.randomUUID());
		partecipante.setEmessoIl(clock.instant());
		partecipanteRepository.save(partecipante);

		notificheService.notificaIscrizione(evento);
		eventi.publishEvent(new TicketEmailEvent(utente.getEmail(), utente.getNome(), evento.getTitolo(),
				evento.getDataEvento(), partecipante.getCodice().toString()));

		return TicketResponse.da(partecipante, clock.instant());
	}

	@Transactional(readOnly = true)
	public TicketResponse miaPartecipazione(UUID eventoId, UUID utenteId) {
		Partecipante partecipante = trova(eventoId, utenteId);
		return TicketResponse.da(partecipante, clock.instant());
	}

	@Transactional
	public void cancellaIscrizione(UUID eventoId, UUID utenteId) {
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		Partecipante partecipante = trova(eventoId, utenteId);

		StatoEvento stato = StatoEvento.calcola(evento, clock.instant());
		if (stato != StatoEvento.PROGRAMMATO) {
			CodiceErrore codice = switch (stato) {
				case IN_CORSO -> CodiceErrore.EVENTO_GIA_INIZIATO;
				case CONCLUSO -> CodiceErrore.EVENTO_CONCLUSO;
				case ANNULLATO -> CodiceErrore.EVENTO_ANNULLATO;
				case PROGRAMMATO -> throw new IllegalStateException("escluso dal case sopra");
			};
			throw new ApplicazioneException(codice, "Ci si puo' disiscrivere solo da un evento PROGRAMMATO");
		}
		partecipanteRepository.delete(partecipante);
	}

	private Partecipante trova(UUID eventoId, UUID utenteId) {
		return partecipanteRepository.findByEventoIdAndUtenteId(eventoId, utenteId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Non sei iscritto a questo evento"));
	}
}
