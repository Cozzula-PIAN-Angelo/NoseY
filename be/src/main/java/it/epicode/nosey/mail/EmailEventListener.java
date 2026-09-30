package it.epicode.nosey.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Invia le email DOPO il commit, in modo @Async (progettazione v4, sezione 0):
 * se l'invio fallisce EmailService scrive nel log, la richiesta resta valida.
 */
@Component
@RequiredArgsConstructor
public class EmailEventListener {

	private final EmailService emailService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void gestisci(CodiceVerificaEmailEvent evento) {
		emailService.inviaCodiceVerifica(evento.destinatario(), evento.nome(), evento.codice());
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void gestisci(TicketEmailEvent evento) {
		emailService.inviaTicket(evento.destinatario(), evento.nome(), evento.titoloEvento(),
				evento.dataEvento(), evento.codiceTicket());
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void gestisci(CodiceResetEmailEvent evento) {
		emailService.inviaCodiceReset(evento.destinatario(), evento.nome(), evento.codice());
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void gestisci(PasswordCambiataEmailEvent evento) {
		emailService.inviaPasswordCambiata(evento.destinatario(), evento.nome());
	}
}
