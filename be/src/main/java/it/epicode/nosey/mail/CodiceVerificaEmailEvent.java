package it.epicode.nosey.mail;

/**
 * Pubblicato dai servizi applicativi (registrazione, ReinviaCodice) DENTRO la
 * transazione: l'invio vero avviene dopo il commit (EmailEventListener).
 */
public record CodiceVerificaEmailEvent(String destinatario, String nome, String codice) {
}
