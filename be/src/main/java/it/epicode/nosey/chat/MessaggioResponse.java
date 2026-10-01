package it.epicode.nosey.chat;

import java.time.Instant;
import java.util.UUID;

/** Un messaggio di chat (sezione 9); stesso DTO per ListaMessaggi e per /user/queue/messages. */
public record MessaggioResponse(UUID id, UUID chatId, UUID mittenteId, String testo, boolean letto, Instant inviatoIl) {

	public static MessaggioResponse da(Messaggio messaggio) {
		return new MessaggioResponse(
				messaggio.getId(),
				messaggio.getChat().getId(),
				messaggio.getMittente().getId(),
				messaggio.getTesto(),
				messaggio.isLetto(),
				messaggio.getInviatoIl());
	}
}
