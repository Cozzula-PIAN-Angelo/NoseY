package it.epicode.nosey.user;

/**
 * Immagine del profilo letta dal database, per il GET pubblico dell'avatar.
 * versione cambia con il contenuto: e' l'ETag della risposta e il parametro v dell'URL.
 */
public record ImmagineProfilo(byte[] contenuto, String contentType, String versione) {
}
