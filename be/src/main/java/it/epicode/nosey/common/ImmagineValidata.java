package it.epicode.nosey.common;

/**
 * Risultato della validazione di un file immagine, pronto per essere salvato
 * direttamente in una colonna bytea (decisione 4): niente url/public_id.
 */
public record ImmagineValidata(byte[] contenuto, String contentType) {
}
