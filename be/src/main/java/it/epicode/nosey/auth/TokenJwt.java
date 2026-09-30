package it.epicode.nosey.auth;

import it.epicode.nosey.user.Utente;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "token_jwt")
@Getter
@Setter
public class TokenJwt {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "utente_id", nullable = false)
	private Utente utente;

	@Column(nullable = false, unique = true)
	private UUID jti;

	@Column(nullable = false)
	private Instant scadenza;

	@Column(nullable = false)
	private boolean revocato = false;

	@Column(name = "creato_il", nullable = false)
	private Instant creatoIl;
}
