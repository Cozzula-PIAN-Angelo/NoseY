package it.epicode.nosey.mail;

/**
 * Pubblicato da PasswordDimenticata DENTRO la transazione: l'invio vero
 * avviene dopo il commit (EmailEventListener).
 */
public record CodiceResetEmailEvent(String destinatario, String nome, String codice) {
}
