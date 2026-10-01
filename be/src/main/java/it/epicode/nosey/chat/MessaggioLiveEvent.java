package it.epicode.nosey.chat;

import java.util.UUID;

/**
 * Pubblicato da InviaMessaggio DENTRO la transazione: dopo il commit MessaggioLiveListener manda
 * il messaggio a tutti e due gli utenti della chat su /user/queue/messages (sezione 11).
 */
public record MessaggioLiveEvent(
		UUID mittenteId,
		UUID destinatarioId,
		MessaggioResponse messaggio
) {
}
