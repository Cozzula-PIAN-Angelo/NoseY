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
				// Percorso del GET pubblico dell'avatar, null se non c'e' un'immagine (decisione 9).
				UtenteResponse.urlImmagineProfilo(utente),
				utente.getStato() == StatoUtente.ATTIVO);
	}
}
