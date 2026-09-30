package it.epicode.nosey.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public record VerifyRequest(
		@NotBlank @Email String email,
		@NotBlank @Pattern(regexp = "\\d{6}", message = "deve essere di 6 cifre") String codice,
		@NotBlank @Size(max = 72) String password
) {

	public VerifyRequest {
		email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
	}
}
