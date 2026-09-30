package it.epicode.nosey.event;

import java.time.Instant;

/**
 * Stato nei DTO (4 valori), calcolato da StatoEventoDb + le date
 * (progettazione v4, sezione 0 "Stato dell'evento"). Mai salvato cosi' nel DB.
 */
public enum StatoEvento {
	PROGRAMMATO,
	IN_CORSO,
	CONCLUSO,
	ANNULLATO;

	// PROGRAMMATO/ANNULLATO stanno nel DB; IN_CORSO e CONCLUSO si calcolano dalle date:
	// niente job che li tenga aggiornati.
	public static StatoEvento calcola(Evento evento, Instant adesso) {
		if (evento.getStato() == StatoEventoDb.ANNULLATO) {
			return ANNULLATO;
		}
		if (adesso.isBefore(evento.getDataEvento())) {
			return PROGRAMMATO;
		}
		if (!adesso.isAfter(evento.getDataFine())) {
			return IN_CORSO;
		}
		return CONCLUSO;
	}
}
