package it.epicode.nosey.notification;

import it.epicode.nosey.friendship.Amicizia;
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
@Table(name = "notifica_amicizia")
@Getter
@Setter
public class NotificaAmicizia {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "destinatario_id", nullable = false)
	private Utente destinatario;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "amicizia_id", nullable = false)
	private Amicizia amicizia;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(nullable = false)
	private TipoNotificaAmicizia tipo;

	@Column(nullable = false)
	private boolean letta = false;

	@Column(name = "creata_il", nullable = false)
	private Instant creataIl;
}
