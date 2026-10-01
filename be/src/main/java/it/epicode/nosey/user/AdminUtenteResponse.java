package it.epicode.nosey.user;

import java.time.Instant;
import java.util.UUID;

/** Utente visto da un admin (progettazione v4, sezione 12). */
public record AdminUtenteResponse(
		UUID id,
		String email,
		String nome,
		String cognome,
		String ruolo,
		StatoUtente stato,
		boolean verificato,
		Instant creatoIl
) {

	// Va chiamato dentro una transazione: legge il ruolo, che e' LAZY.
	public static AdminUtenteResponse da(Utente utente) {
		return new AdminUtenteResponse(
				utente.getId(),
				utente.getEmail(),
				utente.getNome(),
				utente.getCognome(),
				utente.getRuolo().getNome(),
				utente.getStato(),
				utente.isVerificato(),
				utente.getCreatoIl());
	}
}
