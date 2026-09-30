package it.epicode.nosey.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "utente")
@Getter
@Setter
public class Utente {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "ruolo_id", nullable = false)
	private Ruolo ruolo;

	@Column(nullable = false, unique = true, length = 255)
	private String email;

	@Column(name = "password_hash", nullable = false, length = 100)
	private String passwordHash;

	@Column(nullable = false, length = 100)
	private String nome;

	@Column(nullable = false, length = 100)
	private String cognome;

	@Column(length = 255)
	private String indirizzo;

	@Column(name = "data_nascita")
	private LocalDate dataNascita;

	@Column(name = "immagine_profilo_url", columnDefinition = "text")
	private String immagineProfiloUrl;

	@Column(name = "immagine_profilo_public_id", length = 255)
	private String immagineProfiloPublicId;

	@Column(nullable = false)
	private boolean verificato = false;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(nullable = false)
	private StatoUtente stato = StatoUtente.ATTIVO;

	@Column(length = 6)
	private String codice;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(name = "codice_scopo")
	private ScopoCodice codiceScopo;

	@Column(name = "codice_inviato_il")
	private Instant codiceInviatoIl;

	@Column(name = "codice_tentativi", nullable = false)
	private int codiceTentativi = 0;

	@Column(name = "invii_codice", nullable = false)
	private int inviiCodice = 0;

	@Column(name = "invii_codice_dal")
	private Instant inviiCodiceDal;

	@Column(name = "creato_il", nullable = false)
	private Instant creatoIl;
}
