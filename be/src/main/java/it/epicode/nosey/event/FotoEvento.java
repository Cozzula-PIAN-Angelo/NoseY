package it.epicode.nosey.event;

import it.epicode.nosey.common.VersioneContenuto;
import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

	// LAZY: fino a 5 MB, si leggono solo nel GET della foto (serve il plugin di Hibernate nel pom).
	@Basic(fetch = FetchType.LAZY)
	@JdbcTypeCode(SqlTypes.VARBINARY)
	@Column(nullable = false)
	private byte[] contenuto;

	@Column(name = "content_type", nullable = false, length = 100)
	private String contentType;

	// Scritta solo da setContenuto: parametro v dell'URL ed ETag (decisione 9).
	@Setter(AccessLevel.NONE)
	@Column(nullable = false, length = 16)
	private String versione;

	@Column(length = 150)
	private String didascalia;

	@Column(nullable = false)
	private boolean copertina = false;

	@Column(name = "caricata_il", nullable = false)
	private Instant caricataIl;

	/** Byte e versione cambiano sempre insieme: la versione non puo' restare quella vecchia. */
	public void setContenuto(byte[] contenuto) {
		this.contenuto = contenuto;
		this.versione = contenuto == null ? null : VersioneContenuto.calcola(contenuto);
	}
}
