package it.epicode.nosey.user;

import it.epicode.nosey.auth.PasswordMax72Byte;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * La password attuale e' da CONTROLLARE: oltre i 72 byte si risponde PASSWORD_ERRATA
 * (nel service), non VALIDAZIONE. La nuova invece non puo' superarli.
 * Le password non si toccano: gli spazi ne fanno parte.
 */
public record CambioPasswordRequest(
		@NotBlank @Size(max = 72) String passwordAttuale,
		@NotBlank @Size(min = 8, max = 72) @PasswordMax72Byte String nuovaPassword
) {
}
