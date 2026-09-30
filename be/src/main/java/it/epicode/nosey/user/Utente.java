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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "utente")
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

	public UUID getId() {
		return id;
	}

	public Ruolo getRuolo() {
		return ruolo;
	}

	public void setRuolo(Ruolo ruolo) {
		this.ruolo = ruolo;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public String getNome() {
		return nome;
	}

	public void setNome(String nome) {
		this.nome = nome;
	}

	public String getCognome() {
		return cognome;
	}

	public void setCognome(String cognome) {
		this.cognome = cognome;
	}

	public String getIndirizzo() {
		return indirizzo;
	}

	public void setIndirizzo(String indirizzo) {
		this.indirizzo = indirizzo;
	}

	public LocalDate getDataNascita() {
		return dataNascita;
	}

	public void setDataNascita(LocalDate dataNascita) {
		this.dataNascita = dataNascita;
	}

	public String getImmagineProfiloUrl() {
		return immagineProfiloUrl;
	}

	public void setImmagineProfiloUrl(String immagineProfiloUrl) {
		this.immagineProfiloUrl = immagineProfiloUrl;
	}

	public String getImmagineProfiloPublicId() {
		return immagineProfiloPublicId;
	}

	public void setImmagineProfiloPublicId(String immagineProfiloPublicId) {
		this.immagineProfiloPublicId = immagineProfiloPublicId;
	}

	public boolean isVerificato() {
		return verificato;
	}

	public void setVerificato(boolean verificato) {
		this.verificato = verificato;
	}

	public StatoUtente getStato() {
		return stato;
	}

	public void setStato(StatoUtente stato) {
		this.stato = stato;
	}

	public String getCodice() {
		return codice;
	}

	public void setCodice(String codice) {
		this.codice = codice;
	}

	public ScopoCodice getCodiceScopo() {
		return codiceScopo;
	}

	public void setCodiceScopo(ScopoCodice codiceScopo) {
		this.codiceScopo = codiceScopo;
	}

	public Instant getCodiceInviatoIl() {
		return codiceInviatoIl;
	}

	public void setCodiceInviatoIl(Instant codiceInviatoIl) {
		this.codiceInviatoIl = codiceInviatoIl;
	}

	public int getCodiceTentativi() {
		return codiceTentativi;
	}

	public void setCodiceTentativi(int codiceTentativi) {
		this.codiceTentativi = codiceTentativi;
	}

	public int getInviiCodice() {
		return inviiCodice;
	}

	public void setInviiCodice(int inviiCodice) {
		this.inviiCodice = inviiCodice;
	}

	public Instant getInviiCodiceDal() {
		return inviiCodiceDal;
	}

	public void setInviiCodiceDal(Instant inviiCodiceDal) {
		this.inviiCodiceDal = inviiCodiceDal;
	}

	public Instant getCreatoIl() {
		return creatoIl;
	}

	public void setCreatoIl(Instant creatoIl) {
		this.creatoIl = creatoIl;
	}
}
