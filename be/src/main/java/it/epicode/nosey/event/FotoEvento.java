package it.epicode.nosey.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "foto_evento")
public class FotoEvento {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "evento_id", nullable = false)
	private Evento evento;

	@Column(nullable = false, columnDefinition = "text")
	private String url;

	@Column(name = "public_id", nullable = false, length = 255)
	private String publicId;

	@Column(length = 150)
	private String didascalia;

	@Column(nullable = false)
	private boolean copertina = false;

	@Column(name = "caricata_il", nullable = false)
	private Instant caricataIl;

	public UUID getId() {
		return id;
	}

	public Evento getEvento() {
		return evento;
	}

	public void setEvento(Evento evento) {
		this.evento = evento;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public String getPublicId() {
		return publicId;
	}

	public void setPublicId(String publicId) {
		this.publicId = publicId;
	}

	public String getDidascalia() {
		return didascalia;
	}

	public void setDidascalia(String didascalia) {
		this.didascalia = didascalia;
	}

	public boolean isCopertina() {
		return copertina;
	}

	public void setCopertina(boolean copertina) {
		this.copertina = copertina;
	}

	public Instant getCaricataIl() {
		return caricataIl;
	}

	public void setCaricataIl(Instant caricataIl) {
		this.caricataIl = caricataIl;
	}
}
