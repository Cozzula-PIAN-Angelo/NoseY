package it.epicode.nosey.user;

import it.epicode.nosey.common.NonVuoto;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * PATCH del profilo (progettazione v4, sezione 2): tutti i campi sono facoltativi.
 * Campo assente o null = invariato · "" su indirizzo = rimosso.
 */
public record ModificaUtenteRequest(
		@Size(max = 100) @NonVuoto String nome,
		@Size(max = 100) @NonVuoto String cognome,
		@Size(max = 255) String indirizzo,
		@Past LocalDate dataNascita
) {

	// strip() prima della validazione: un nome di soli spazi diventa "" e @NonVuoto lo rifiuta,
	// un indirizzo di soli spazi diventa "" e quindi si rimuove.
	public ModificaUtenteRequest {
		nome = nome == null ? null : nome.strip();
		cognome = cognome == null ? null : cognome.strip();
		indirizzo = indirizzo == null ? null : indirizzo.strip();
	}

	/** Nessun campo valorizzato → 400 RICHIESTA_VUOTA. "" su indirizzo conta come valorizzato. */
	public boolean vuota() {
		return nome == null && cognome == null && indirizzo == null && dataNascita == null;
	}
}
