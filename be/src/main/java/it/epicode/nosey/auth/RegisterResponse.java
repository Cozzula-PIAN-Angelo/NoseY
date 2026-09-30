package it.epicode.nosey.auth;

import java.util.UUID;

/**
 * Risposta della registrazione: MAI il codice di verifica, che arriva solo via email.
 */
public record RegisterResponse(UUID id, String email) {
}
