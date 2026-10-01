package it.epicode.nosey.ticket;

import it.epicode.nosey.friendship.RelazioneAmicizia;
import it.epicode.nosey.friendship.StatoAmiciziaVista;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtentePubblicoResponse;

import java.util.UUID;

/**
 * Una persona di ListaPartecipanti (progettazione v4, sezione 7), dal punto di vista di chi chiede.
 * amiciziaId e chatId sono valorizzati con INVIATA, RICEVUTA e AMICI, altrimenti null; con AMICI
 * chatId c'e' sempre (decisione 20).
 */
public record PartecipanteResponse(UtentePubblicoResponse utente, boolean proprietario,
		StatoAmiciziaVista statoAmicizia, UUID amiciziaId, UUID chatId) {

	public static PartecipanteResponse da(Utente utente, boolean proprietario, RelazioneAmicizia relazione) {
		return new PartecipanteResponse(UtentePubblicoResponse.da(utente), proprietario,
				relazione.stato(), relazione.amiciziaId(), relazione.chatId());
	}
}
