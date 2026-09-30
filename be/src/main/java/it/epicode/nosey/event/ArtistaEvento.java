package it.epicode.nosey.event;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "artista_evento")
@Getter
@Setter
public class ArtistaEvento {

	@EmbeddedId
	private ArtistaEventoId id = new ArtistaEventoId();

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@MapsId("eventoId")
	@JoinColumn(name = "evento_id", nullable = false)
	private Evento evento;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@MapsId("artistaId")
	@JoinColumn(name = "artista_id", nullable = false)
	private Artista artista;
}
