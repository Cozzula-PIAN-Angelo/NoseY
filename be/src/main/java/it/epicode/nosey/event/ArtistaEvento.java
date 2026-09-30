package it.epicode.nosey.event;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

@Entity
@Table(name = "artista_evento")
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

	public ArtistaEventoId getId() {
		return id;
	}

	public Evento getEvento() {
		return evento;
	}

	public void setEvento(Evento evento) {
		this.evento = evento;
	}

	public Artista getArtista() {
		return artista;
	}

	public void setArtista(Artista artista) {
		this.artista = artista;
	}
}
