package it.epicode.nosey.user;

import jakarta.validation.constraints.NotNull;

/**
 * Nome del ruolo, identico a RUOLO.nome: solo USER o ADMIN (decisione 21).
 * SUPERADMIN → RUOLO_NON_AMMESSO, un nome che non esiste → VALIDAZIONE (li controlla il service).
 */
public record CambiaRuoloRequest(@NotNull String ruolo) {
}
