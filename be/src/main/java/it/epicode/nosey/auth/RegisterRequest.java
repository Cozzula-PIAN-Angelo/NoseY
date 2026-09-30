package it.epicode.nosey.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.Locale;

public record RegisterRequest(
		@NotBlank @Email @Size(max = 255) String email,
		@NotBlank @Size(min = 8, max = 72) @PasswordMax72Byte String password,
		@NotBlank @Size(max = 100) String nome,
		@NotBlank @Size(max = 100) String cognome,
		@Size(max = 255) String indirizzo,
		@NotNull @Past LocalDate dataNascita
) {

	// Normalizzazione qui, prima della validazione: @Email vede gia' il valore pulito.
	// La password non si tocca: gli spazi fanno parte della password.
	public RegisterRequest {
		email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
		nome = nome == null ? null : nome.strip();
		cognome = cognome == null ? null : cognome.strip();
		indirizzo = indirizzo == null || indirizzo.isBlank() ? null : indirizzo.strip();
	}
}
