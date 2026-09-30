package it.epicode.nosey.event;

import it.epicode.nosey.common.VersioneContenuto;
import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
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

	// LAZY: si leggono solo nel GET dell'immagine (serve il plugin di Hibernate nel pom).
	// Per sapere se c'e' un'immagine si usa immagineVersione, che non legge i byte.
	@Basic(fetch = FetchType.LAZY)
	@JdbcTypeCode(SqlTypes.VARBINARY)
	private byte[] immagine;

	@Column(name = "immagine_content_type", length = 100)
	private String immagineContentType;

	// Scritta solo da setImmagine: parametro v dell'URL ed ETag (decisione 9).
	@Setter(AccessLevel.NONE)
	@Column(name = "immagine_versione", length = 16)
	private String immagineVersione;

	@Column(nullable = false)
	private boolean attivo = true;

	/** Byte e versione cambiano sempre insieme: la versione non puo' restare quella vecchia. */
	public void setImmagine(byte[] immagine) {
		this.immagine = immagine;
		this.immagineVersione = immagine == null ? null : VersioneContenuto.calcola(immagine);
	}
}
