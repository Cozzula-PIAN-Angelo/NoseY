package it.epicode.nosey.event;

/**
 * Stato salvato nel DB: solo 2 valori. IN_CORSO e CONCLUSO si calcolano
 * dalle date nei DTO (sezione 0 "Stato dell'evento" della progettazione).
 */
public enum StatoEventoDb {
	PROGRAMMATO,
	ANNULLATO
}
