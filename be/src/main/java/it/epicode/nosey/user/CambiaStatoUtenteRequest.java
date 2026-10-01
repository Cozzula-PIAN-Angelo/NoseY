package it.epicode.nosey.user;

import jakarta.validation.constraints.NotNull;

/** Solo ATTIVO o SOSPESO: ANONIMIZZATO lo rifiuta il service con STATO_NON_AMMESSO. */
public record CambiaStatoUtenteRequest(@NotNull StatoUtente stato) {
}
