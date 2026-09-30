package it.epicode.nosey.auth;

import java.time.Instant;

/**
 * Token appena firmato e la sua scadenza (servono a LoginResponse).
 */
public record TokenEmesso(String token, Instant scadenza) {
}
