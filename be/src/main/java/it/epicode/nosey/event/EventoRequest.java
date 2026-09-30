package it.epicode.nosey.event;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record EventoRequest(
		@NotBlank @Size(max = 150) String titolo,
		@Size(max = 5000) String descrizione,
		@NotNull @Future Instant dataEvento,
		@NotNull @Future Instant dataFine,
		@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
		@NotNull @DecimalMin("-180") @DecimalMax("180") Double lng
) {
}
