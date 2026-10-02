package it.epicode.nosey.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// AnnullaEventoModerazione (sezione 12): a differenza di AnnullaEventoRequest, qui il motivo e' obbligatorio.
public record AnnullaEventoModerazioneRequest(@NotBlank @Size(max = 500) String motivo) {
}
