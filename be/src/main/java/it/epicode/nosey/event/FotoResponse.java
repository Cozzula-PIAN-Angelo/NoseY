package it.epicode.nosey.event;

import java.util.UUID;

public record FotoResponse(UUID id, String url, String didascalia, boolean copertina) {

	public static FotoResponse da(UUID eventoId, FotoEvento foto) {
		return new FotoResponse(foto.getId(), url(eventoId, foto), foto.getDidascalia(), foto.isCopertina());
	}

	/**
	 * Percorso relativo del GET pubblico della foto (decisione 9). La foto e' sempre presente.
	 * Usa la colonna della versione, non i byte: cosi' la foto non si legge dal database.
	 */
	public static String url(UUID eventoId, FotoEvento foto) {
		return "/api/events/" + eventoId + "/photos/" + foto.getId() + "/image?v=" + foto.getVersione();
	}
}
