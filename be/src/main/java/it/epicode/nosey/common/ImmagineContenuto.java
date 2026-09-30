package it.epicode.nosey.common;

/**
 * Contenuto di un'immagine letta dal database, per un GET pubblico (decisione 9):
 * versione e' l'ETag della risposta e il parametro v dell'URL.
 */
public record ImmagineContenuto(byte[] contenuto, String contentType, String versione) {
}
