package it.epicode.nosey.event;

import it.epicode.nosey.user.UtentePubblicoResponse;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EventoDettaglioResponse(
		UUID id,
		String titolo,
		String descrizione,
		Instant dataEvento,
		Instant dataFine,
		StatoEvento stato,
		String motivoAnnullamento,
		double lat,
		double lng,
		UtentePubblicoResponse proprietario,
		List<FotoResponse> foto,
		List<ArtistaResponse> artisti,
		List<PoiResponse> poi,
		long numeroPartecipanti,
		boolean sonoProprietario,
		boolean sonoIscritto
) {
}
