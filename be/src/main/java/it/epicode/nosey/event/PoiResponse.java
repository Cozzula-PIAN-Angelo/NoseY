package it.epicode.nosey.event;

import java.util.UUID;

public record PoiResponse(UUID id, TipoPoi tipo, double lat, double lng, String etichetta) {

	public static PoiResponse da(Poi poi) {
		return new PoiResponse(poi.getId(), poi.getTipo(), poi.getLat(), poi.getLng(), poi.getEtichetta());
	}
}
