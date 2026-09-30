package it.epicode.nosey.user;

import java.util.UUID;

/**
 * Dati pubblici di UN ALTRO utente (proprietario evento, partecipanti, amici, chat).
 * Per l'utente stesso si usa UtenteResponse (progettazione v4, sezione 0, DTO comuni).
 */
public record UtentePubblicoResponse(UUID id, String nome, String cognome, String immagineProfilo, boolean attivo) {

	public static UtentePubblicoResponse da(Utente utente) {
		return new UtentePubblicoResponse(
				utente.getId(),
				utente.getNome(),
				utente.getCognome(),
				// Immagini nel database (decisione 4): formato di questo campo ancora
				// da decidere (serve un endpoint che serva i byte), per ora sempre null.
				null,
				utente.getStato() == StatoUtente.ATTIVO);
	}
}
