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
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "evento")
@Getter
@Setter
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
}
