package it.epicode.nosey.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Push delle notifiche events e friendships dopo il commit (sezioni 10 e 11). Le chat non passano
 * di qui: per loro arriva solo il messaggio su /user/queue/messages, cosi' il badge non conta due volte.
 */
@Component
@RequiredArgsConstructor
public class NotificaLiveListener {

	/** Coda delle notifiche, relativa al prefisso /user. */
	static final String CODA = "/queue/notifications";

	private final SimpMessagingTemplate messagingTemplate;

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void gestisci(NotificaLiveEvent evento) {
		messagingTemplate.convertAndSendToUser(evento.destinatarioId().toString(), CODA, evento.notifica());
	}
}
