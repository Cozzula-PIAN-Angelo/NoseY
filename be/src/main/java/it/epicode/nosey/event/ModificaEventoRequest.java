package it.epicode.nosey.event;

import it.epicode.nosey.common.NonVuoto;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * PATCH dell'evento (progettazione v4, sezione 3): tutti i campi sono facoltativi.
 * Campo assente o null = invariato · "" su descrizione = rimossa.
 * Niente @Future qui: dataEvento/dataFine si controllano nel service (un evento gia'
 * iniziato puo' rimandare una data invariata senza errore).
 */
public record ModificaEventoRequest(
		@Size(max = 150) @NonVuoto String titolo,
		@Size(max = 5000) String descrizione,
		Instant dataEvento,
		Instant dataFine,
		@DecimalMin("-90") @DecimalMax("90") Double lat,
		@DecimalMin("-180") @DecimalMax("180") Double lng
) {

	public ModificaEventoRequest {
		titolo = titolo == null ? null : titolo.strip();
		descrizione = descrizione == null ? null : descrizione.strip();
	}

	/** Nessun campo valorizzato → 400 RICHIESTA_VUOTA. "" su descrizione conta come valorizzato. */
	public boolean vuota() {
		return titolo == null && descrizione == null && dataEvento == null && dataFine == null
				&& lat == null && lng == null;
	}
}
