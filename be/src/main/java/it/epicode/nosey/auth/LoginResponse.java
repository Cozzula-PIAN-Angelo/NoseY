package it.epicode.nosey.auth;

import it.epicode.nosey.user.UtenteResponse;

import java.time.Instant;

public record LoginResponse(String token, Instant scadenza, UtenteResponse utente) {
}
