package it.epicode.nosey.event;

import it.epicode.nosey.common.VersioneContenuto;

import java.util.UUID;

public record FotoResponse(UUID id, String url, String didascalia, boolean copertina) {

	public static FotoResponse da(UUID eventoId, FotoEvento foto) {
		return new FotoResponse(foto.getId(), url(eventoId, foto), foto.getDidascalia(), foto.isCopertina());
	}

	/** Percorso relativo del GET pubblico della foto (decisione 9). La foto e' sempre presente. */
	public static String url(UUID eventoId, FotoEvento foto) {
		return "/api/events/" + eventoId + "/photos/" + foto.getId() + "/image?v="
				+ VersioneContenuto.calcola(foto.getContenuto());
	}
}
