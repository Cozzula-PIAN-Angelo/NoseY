package it.epicode.nosey.auth;

import java.security.Principal;
import java.time.Instant;
import java.util.UUID;

/**
 * Chi fa la richiesta, ricavato da un token valido: e' il principal di ogni
 * richiesta autenticata. jti e scadenza servono a revocare il token corrente.
 */
public record UtenteAutenticato(UUID id, String ruolo, UUID jti, Instant scadenza) implements Principal {

	@Override
	public String getName() {
		return id.toString();
	}
}
