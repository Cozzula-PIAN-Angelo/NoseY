package it.epicode.nosey.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Push dei messaggi di chat dopo il commit (sezioni 11 e 18): se la transazione fallisce non parte
 * niente. Arriva a tutte le sessioni dei due utenti, anche a quelle del mittente in altre schede.
 */
@Component
@RequiredArgsConstructor
public class MessaggioLiveListener {

	/** Coda dei messaggi, relativa al prefisso /user (il client fa SUBSCRIBE a /user/queue/messages). */
	static final String CODA = "/queue/messages";

	private final SimpMessagingTemplate messagingTemplate;

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void gestisci(MessaggioLiveEvent evento) {
		messagingTemplate.convertAndSendToUser(evento.mittenteId().toString(), CODA, evento.messaggio());
		messagingTemplate.convertAndSendToUser(evento.destinatarioId().toString(), CODA, evento.messaggio());
	}
}
