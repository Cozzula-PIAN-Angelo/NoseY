package it.epicode.nosey.friendship;

import it.epicode.nosey.event.Evento;
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
@Table(name = "amicizia")
@Getter
@Setter
public class Amicizia {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "richiedente_id", nullable = false)
	private Utente richiedente;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "ricevente_id", nullable = false)
	private Utente ricevente;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "evento_id", nullable = false)
	private Evento evento;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(nullable = false)
	private StatoAmicizia stato = StatoAmicizia.PENDENTE;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "chiusa_da")
	private Utente chiusaDa;

	@Column(name = "richiesta_mascherata", nullable = false)
	private boolean richiestaMascherata = false;

	@Column(name = "creata_il", nullable = false)
	private Instant creataIl;

	@Column(name = "aggiornata_il", nullable = false)
	private Instant aggiornataIl;
}
