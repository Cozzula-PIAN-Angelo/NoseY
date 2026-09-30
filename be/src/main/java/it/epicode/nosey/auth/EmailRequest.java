package it.epicode.nosey.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.Locale;

/** Body di ReinviaCodice e PasswordDimenticata (progettazione v4, sezione 1). */
public record EmailRequest(
		@NotBlank @Email String email
) {

	public EmailRequest {
		email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
	}
}
