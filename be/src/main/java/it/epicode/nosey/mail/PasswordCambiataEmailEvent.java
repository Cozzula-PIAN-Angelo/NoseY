package it.epicode.nosey.mail;

/**
 * Pubblicato da CambioPassword e ReimpostaPassword DENTRO la transazione:
 * l'invio vero avviene dopo il commit (EmailEventListener).
 */
public record PasswordCambiataEmailEvent(String destinatario, String nome) {
}
