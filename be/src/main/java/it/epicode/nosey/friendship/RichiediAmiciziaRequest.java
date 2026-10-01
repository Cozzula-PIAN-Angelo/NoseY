package it.epicode.nosey.friendship;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** RichiediAmicizia (progettazione v4, sezione 8). */
public record RichiediAmiciziaRequest(
		@NotNull UUID riceventeId,
		@NotNull UUID eventoId) {
}
