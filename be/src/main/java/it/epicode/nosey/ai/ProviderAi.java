package it.epicode.nosey.ai;

/**
 * Il servizio esterno che migliora la descrizione (decisione 18: Google Gemini).
 * Riceve SIA l'immagine SIA la descrizione (requisito della traccia).
 * Qualsiasi problema (chiave mancante, timeout, errore o risposta vuota) → 502 SERVIZIO_ESTERNO.
 */
public interface ProviderAi {

	String migliora(byte[] immagine, String contentType, String descrizione);
}
