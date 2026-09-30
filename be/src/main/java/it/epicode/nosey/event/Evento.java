package it.epicode.nosey.event;

import it.epicode.nosey.user.Utente;
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
import java.util.UUID;

@Entity
@Table(name = "evento")
public class Evento {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "proprietario_id", nullable = false)
	private Utente proprietario;

	@Column(nullable = false, length = 150)
	private String titolo;

	@Column(length = 5000)
	private String descrizione;

	@Column(name = "data_evento", nullable = false)
	private Instant dataEvento;

	@Column(name = "data_fine", nullable = false)
	private Instant dataFine;

	@Column(nullable = false)
	private double lat;

	@Column(nullable = false)
	private double lng;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(nullable = false)
	private StatoEventoDb stato = StatoEventoDb.PROGRAMMATO;

	@Column(name = "motivo_annullamento", length = 500)
	private String motivoAnnullamento;

	@Column(name = "creato_il", nullable = false)
	private Instant creatoIl;

	public UUID getId() {
		return id;
	}

	public Utente getProprietario() {
		return proprietario;
	}

	public void setProprietario(Utente proprietario) {
		this.proprietario = proprietario;
	}

	public String getTitolo() {
		return titolo;
	}

	public void setTitolo(String titolo) {
		this.titolo = titolo;
	}

	public String getDescrizione() {
		return descrizione;
	}

	public void setDescrizione(String descrizione) {
		this.descrizione = descrizione;
	}

	public Instant getDataEvento() {
		return dataEvento;
	}

	public void setDataEvento(Instant dataEvento) {
		this.dataEvento = dataEvento;
	}

	public Instant getDataFine() {
		return dataFine;
	}

	public void setDataFine(Instant dataFine) {
		this.dataFine = dataFine;
	}

	public double getLat() {
		return lat;
	}

	public void setLat(double lat) {
		this.lat = lat;
	}

	public double getLng() {
		return lng;
	}

	public void setLng(double lng) {
		this.lng = lng;
	}

	public StatoEventoDb getStato() {
		return stato;
	}

	public void setStato(StatoEventoDb stato) {
		this.stato = stato;
	}

	public String getMotivoAnnullamento() {
		return motivoAnnullamento;
	}

	public void setMotivoAnnullamento(String motivoAnnullamento) {
		this.motivoAnnullamento = motivoAnnullamento;
	}

	public Instant getCreatoIl() {
		return creatoIl;
	}

	public void setCreatoIl(Instant creatoIl) {
		this.creatoIl = creatoIl;
	}
}
