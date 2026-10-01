package it.epicode.nosey.ticket;

import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.StatoEvento;
import it.epicode.nosey.user.Utente;

import java.time.Instant;
import java.util.UUID;

/** Progettazione v4, sezione 0 "DTO comuni". */
public record TicketResponse(UUID id, UUID codice, Instant emessoIl, EventoTicket evento, PartecipanteTicket partecipante) {

	public static TicketResponse da(Partecipante partecipante, Instant adesso) {
		return new TicketResponse(
				partecipante.getId(),
				partecipante.getCodice(),
				partecipante.getEmessoIl(),
				EventoTicket.da(partecipante.getEvento(), adesso),
				PartecipanteTicket.da(partecipante.getUtente()));
	}

	public record EventoTicket(UUID id, String titolo, Instant dataEvento, Instant dataFine, StatoEvento stato,
			double lat, double lng) {

		public static EventoTicket da(Evento evento, Instant adesso) {
			return new EventoTicket(evento.getId(), evento.getTitolo(), evento.getDataEvento(), evento.getDataFine(),
					StatoEvento.calcola(evento, adesso), evento.getLat(), evento.getLng());
		}
	}

	public record PartecipanteTicket(String nome, String cognome) {

		public static PartecipanteTicket da(Utente utente) {
			return new PartecipanteTicket(utente.getNome(), utente.getCognome());
		}
	}
}
