package it.epicode.nosey.event;

import java.util.UUID;

public record ArtistaResponse(UUID id, String nome, String immagineUrl, boolean attivo) {

	public static ArtistaResponse da(Artista artista) {
		return new ArtistaResponse(
				artista.getId(),
				artista.getNome(),
				// Vedi nota in UtentePubblicoResponse: formato ancora da decidere, per ora sempre null.
				null,
				artista.isAttivo());
	}
}
