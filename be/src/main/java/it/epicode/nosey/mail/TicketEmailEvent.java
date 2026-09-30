package it.epicode.nosey.mail;

import java.time.Instant;

/**
 * Pubblicato da IscrizioneEvento DENTRO la transazione: l'invio vero avviene
 * dopo il commit (EmailEventListener).
 */
public record TicketEmailEvent(
		String destinatario,
		String nome,
		String titoloEvento,
		Instant dataEvento,
		String codiceTicket
) {
}
