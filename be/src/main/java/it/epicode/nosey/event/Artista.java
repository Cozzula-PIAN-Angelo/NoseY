package it.epicode.nosey.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "artista")
@Getter
@Setter
public class Artista {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, length = 100)
	private String nome;

	@JdbcTypeCode(SqlTypes.VARBINARY)
	private byte[] immagine;

	@Column(name = "immagine_content_type", length = 100)
	private String immagineContentType;

	@Column(nullable = false)
	private boolean attivo = true;
}
