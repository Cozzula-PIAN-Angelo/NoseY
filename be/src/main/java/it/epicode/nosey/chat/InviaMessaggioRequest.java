package it.epicode.nosey.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload di InviaMessaggio (sezione 11). Validato nel service, non con @Valid: la validazione
 * viene dopo i controlli su token e limite di frequenza (decisione 17).
 */
public record InviaMessaggioRequest(@NotBlank @Size(max = 2000) String testo) {
}
