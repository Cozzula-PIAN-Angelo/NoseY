package it.epicode.nosey.event;

import jakarta.validation.constraints.Size;

/**
 * PATCH della foto (progettazione v4, sezione 4): tutti i campi sono facoltativi.
 * didascalia: "" = rimossa · copertina: solo true, diventa la copertina (false = 400).
 */
public record ModificaFotoRequest(@Size(max = 150) String didascalia, Boolean copertina) {

	public boolean vuota() {
		return didascalia == null && copertina == null;
	}
}
