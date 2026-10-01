package it.epicode.nosey.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * InviaNotificaManuale (progettazione v4, sezione 10). Il testo si salva con strip().
 */
public record NotificaManualeRequest(@NotBlank @Size(max = 500) String testo) {
}
