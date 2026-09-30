package it.epicode.nosey.event;

/**
 * Stato nei DTO (4 valori), calcolato dal mapper da StatoEventoDb + le date
 * (progettazione v4, sezione 0 "Stato dell'evento"). Mai salvato cosi' nel DB.
 */
public enum StatoEvento {
	PROGRAMMATO,
	IN_CORSO,
	CONCLUSO,
	ANNULLATO
}
