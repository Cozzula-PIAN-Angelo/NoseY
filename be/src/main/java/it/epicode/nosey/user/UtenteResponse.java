package it.epicode.nosey.user;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Dati dell'utente SOLO per l'utente stesso (progettazione v4, sezione 0, DTO comuni).
 * Per gli altri utenti si usa UtentePubblicoResponse.
 */
public record UtenteResponse(
		UUID id,
		String email,
		String nome,
		String cognome,
		String indirizzo,
		LocalDate dataNascita,
		String immagineProfilo,
		String ruolo
) {

	// Va chiamato dentro una transazione: legge il ruolo, che e' LAZY.
	public static UtenteResponse da(Utente utente) {
		return new UtenteResponse(
				utente.getId(),
				utente.getEmail(),
				utente.getNome(),
				utente.getCognome(),
				utente.getIndirizzo(),
				utente.getDataNascita(),
				// Con le immagini nel database (decisione 4) il formato di questo campo
				// e' ancora da decidere (BE2-06/BE2-07): per ora sempre null.
				null,
				utente.getRuolo().getNome());
	}
}
