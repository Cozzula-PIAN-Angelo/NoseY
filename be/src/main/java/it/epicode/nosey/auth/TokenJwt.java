package it.epicode.nosey.auth;

import java.time.Instant;
import java.util.UUID;

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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Un token emesso: il jti e' quello scritto nel JWT. Il logout lo revoca.
 */
@Entity
@Table(name = "token_jwt")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TokenJwt {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "utente_id")
	private Utente utente;

	@Column(nullable = false, updatable = false)
	private UUID jti;

	@Column(nullable = false, updatable = false)
	private Instant scadenza;

	@Setter
	@Column(nullable = false)
	private boolean revocato = false;

	@Column(nullable = false, updatable = false)
	private Instant creatoIl;

	public TokenJwt(Utente utente, UUID jti, Instant scadenza, Instant creatoIl) {
		this.utente = utente;
		this.jti = jti;
		this.scadenza = scadenza;
		this.creatoIl = creatoIl;
	}
}
