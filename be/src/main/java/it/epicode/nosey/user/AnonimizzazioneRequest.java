package it.epicode.nosey.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Conferma dell'anonimizzazione, che e' irreversibile. La password e' da CONTROLLARE:
 * oltre i 72 byte si risponde PASSWORD_ERRATA (nel service), non VALIDAZIONE.
 */
public record AnonimizzazioneRequest(@NotBlank @Size(max = 72) String password) {
}
