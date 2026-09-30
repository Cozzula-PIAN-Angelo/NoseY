package it.epicode.nosey.user;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "utente")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Utente {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Setter(AccessLevel.NONE)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "ruolo_id")
	private Ruolo ruolo;

	// Sempre minuscola: la normalizzazione avviene nel DTO.
	@Column(nullable = false)
	private String email;

	@Column(nullable = false, length = 100)
	private String passwordHash;

	@Column(nullable = false, length = 100)
	private String nome;

	@Column(nullable = false, length = 100)
	private String cognome;

	private String indirizzo;

	// NULL solo dopo l'anonimizzazione.
	private LocalDate dataNascita;

	// URL e public id di Cloudinary: presenti o assenti insieme (ck_utente_immagine).
	private String immagineProfiloUrl;

	private String immagineProfiloPublicId;

	@Column(nullable = false)
	private boolean verificato = false;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(nullable = false)
	private StatoUtente stato = StatoUtente.ATTIVO;

	// Codice a 6 cifre e scopo: presenti o assenti insieme (ck_utente_codice).
	@Column(length = 6)
	private String codice;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	private ScopoCodice codiceScopo;

	private Instant codiceInviatoIl;

	@Column(nullable = false)
	private int codiceTentativi = 0;

	@Column(nullable = false)
	private int inviiCodice = 0;

	private Instant inviiCodiceDal;

	@Column(nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant creatoIl;

	public Utente(Ruolo ruolo, String email, String passwordHash, String nome, String cognome,
			String indirizzo, LocalDate dataNascita, Instant creatoIl) {
		this.ruolo = ruolo;
		this.email = email;
		this.passwordHash = passwordHash;
		this.nome = nome;
		this.cognome = cognome;
		this.indirizzo = indirizzo;
		this.dataNascita = dataNascita;
		this.creatoIl = creatoIl;
	}
}
