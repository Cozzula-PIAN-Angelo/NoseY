package it.epicode.nosey.event;

import it.epicode.nosey.common.VersioneContenuto;

import java.util.UUID;

public record ArtistaResponse(UUID id, String nome, String immagineUrl, boolean attivo) {

	public static ArtistaResponse da(Artista artista) {
		return new ArtistaResponse(artista.getId(), artista.getNome(), url(artista), artista.isAttivo());
	}

	/** Percorso relativo del GET pubblico dell'immagine (decisione 9). null se non c'e'. */
	public static String url(Artista artista) {
		if (artista.getImmagine() == null) {
			return null;
		}
		return "/api/artists/" + artista.getId() + "/image?v=" + VersioneContenuto.calcola(artista.getImmagine());
	}
}
