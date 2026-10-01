package it.epicode.nosey.friendship;

import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtentePubblicoResponse;

import java.util.UUID;

/**
 * Progettazione v4, sezione 8. stato e altroUtente sono sempre dal punto di vista di chi chiede;
 * chatId e' la chat della coppia se esiste (anche in sola lettura), altrimenti null.
 */
public record AmiciziaResponse(UUID id, UtentePubblicoResponse altroUtente, StatoAmiciziaVista stato,
		UUID eventoId, UUID chatId) {

	public static AmiciziaResponse da(Amicizia amicizia, Utente altroUtente, StatoAmiciziaVista stato, UUID chatId) {
		return new AmiciziaResponse(
				amicizia.getId(),
				UtentePubblicoResponse.da(altroUtente),
				stato,
				amicizia.getEvento().getId(),
				chatId);
	}
}
