package it.epicode.nosey.event;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

/**
 * PATCH del POI (progettazione v4, sezione 5): tutti i campi sono facoltativi.
 * etichetta: "" = rimossa.
 */
public record ModificaPoiRequest(
		TipoPoi tipo,
		@DecimalMin("-90") @DecimalMax("90") Double lat,
		@DecimalMin("-180") @DecimalMax("180") Double lng,
		@Size(max = 50) String etichetta
) {

	public boolean vuota() {
		return tipo == null && lat == null && lng == null && etichetta == null;
	}
}
