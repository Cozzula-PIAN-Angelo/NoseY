package it.epicode.nosey.notification;

import java.util.UUID;

/**
 * Pubblicato da NotificheService DENTRO la transazione, per ogni notifica creata o accorpata.
 * L'invio su /user/queue/notifications avviene dopo il commit, in un
 * @TransactionalEventListener(phase = AFTER_COMMIT) che arriva con il WebSocket (BE2-14).
 * Una notifica accorpata ha lo stesso id: il frontend la sostituisce senza aumentare il badge.
 */
public record NotificaLiveEvent(
		UUID destinatarioId,
		NotificaResponse notifica
) {
}
