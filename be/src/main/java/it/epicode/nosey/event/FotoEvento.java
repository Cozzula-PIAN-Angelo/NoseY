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
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "foto_evento")
@Getter
@Setter
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
}
