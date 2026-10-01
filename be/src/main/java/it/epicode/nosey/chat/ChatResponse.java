package it.epicode.nosey.chat;

import it.epicode.nosey.user.UtentePubblicoResponse;

import java.time.Instant;
import java.util.UUID;

/**
 * Una chat di ListaChat (sezione 9).
 * ultimoMessaggio null se non ce ne sono · nonLetti = messaggi dell'altro non ancora letti ·
 * puoiScrivere = amicizia ACCETTATA e tutti e due gli utenti ATTIVO.
 */
public record ChatResponse(UUID id, UtentePubblicoResponse amico, UltimoMessaggio ultimoMessaggio, long nonLetti,
		boolean puoiScrivere) {

	public record UltimoMessaggio(String testo, UUID mittenteId, Instant inviatoIl) {

		public static UltimoMessaggio da(Messaggio messaggio) {
			return new UltimoMessaggio(messaggio.getTesto(), messaggio.getMittente().getId(),
					messaggio.getInviatoIl());
		}
	}
}
