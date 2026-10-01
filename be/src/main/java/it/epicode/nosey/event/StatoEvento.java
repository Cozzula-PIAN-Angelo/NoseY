package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;

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

	/**
	 * Evento concluso o annullato: niente scritture su di esso ne' sulle sue sotto-risorse
	 * (foto, POI, artisti). Usato da EventoService e dai service delle sotto-risorse.
	 */
	public static StatoEvento controllaScrivibile(Evento evento, Instant adesso) {
		StatoEvento stato = calcola(evento, adesso);
		if (stato == CONCLUSO) {
			throw new ApplicazioneException(CodiceErrore.EVENTO_CONCLUSO, "L'evento e' concluso");
		}
		if (stato == ANNULLATO) {
			throw new ApplicazioneException(CodiceErrore.EVENTO_ANNULLATO, "L'evento e' annullato");
		}
		return stato;
	}
}
