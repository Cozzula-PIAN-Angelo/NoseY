package it.epicode.nosey.friendship;

/**
 * statoAmicizia: come chi fa la richiesta vede la relazione con un altro utente
 * (progettazione v4, sezione 8). Diverso da StatoAmicizia, che e' lo stato salvato nel database.
 */
public enum StatoAmiciziaVista {
	NESSUNA,
	INVIATA,
	RICEVUTA,
	AMICI,
	NON_DISPONIBILE
}
