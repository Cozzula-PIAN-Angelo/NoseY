package it.epicode.nosey.event;

import java.util.UUID;

public record FotoResponse(UUID id, String immagineUrl, String didascalia, boolean copertina) {

	public static FotoResponse da(FotoEvento foto) {
		return new FotoResponse(
				foto.getId(),
				// Vedi nota in UtentePubblicoResponse: formato ancora da decidere, per ora sempre null.
				null,
				foto.getDidascalia(),
				foto.isCopertina());
	}
}
