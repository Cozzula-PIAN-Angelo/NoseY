package it.epicode.nosey.event;

import java.time.Instant;
import java.util.UUID;

public record EventoMappaResponse(
		UUID id,
		String titolo,
		Instant dataEvento,
		Instant dataFine,
		StatoEvento stato,
		double lat,
		double lng,
		String copertinaUrl,
		Double distanzaKm
) {

	public static EventoMappaResponse da(Evento evento, FotoEvento copertina, Double distanzaKm, Instant adesso) {
		return new EventoMappaResponse(
				evento.getId(),
				evento.getTitolo(),
				evento.getDataEvento(),
				evento.getDataFine(),
				StatoEvento.calcola(evento, adesso),
				evento.getLat(),
				evento.getLng(),
				copertina == null ? null : FotoResponse.url(evento.getId(), copertina),
				distanzaKm);
	}
}
