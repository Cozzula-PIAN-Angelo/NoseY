package it.epicode.nosey.ai;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * MiglioraDescrizioneAI (progettazione v4, sezione 3). descrizione facoltativa: se manca o e'
 * vuota si usa quella salvata, cosi' si migliora anche un testo non ancora salvato.
 */
public record MiglioraDescrizioneRequest(
		@NotNull UUID fotoId,
		@Size(max = 5000) String descrizione
) {

	public MiglioraDescrizioneRequest {
		descrizione = descrizione == null ? null : descrizione.strip();
	}
}
