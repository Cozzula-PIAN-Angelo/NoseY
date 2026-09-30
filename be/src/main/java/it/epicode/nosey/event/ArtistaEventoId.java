package it.epicode.nosey.event;

import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class ArtistaEventoId implements Serializable {

	private UUID eventoId;
	private UUID artistaId;

	public ArtistaEventoId() {
	}

	public ArtistaEventoId(UUID eventoId, UUID artistaId) {
		this.eventoId = eventoId;
		this.artistaId = artistaId;
	}

	public UUID getEventoId() {
		return eventoId;
	}

	public void setEventoId(UUID eventoId) {
		this.eventoId = eventoId;
	}

	public UUID getArtistaId() {
		return artistaId;
	}

	public void setArtistaId(UUID artistaId) {
		this.artistaId = artistaId;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) return true;
		if (!(o instanceof ArtistaEventoId that)) return false;
		return Objects.equals(eventoId, that.eventoId) && Objects.equals(artistaId, that.artistaId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(eventoId, artistaId);
	}
}
