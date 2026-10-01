package it.epicode.nosey.event;

import jakarta.validation.constraints.Size;

public record AnnullaEventoRequest(@Size(max = 500) String motivo) {
}
