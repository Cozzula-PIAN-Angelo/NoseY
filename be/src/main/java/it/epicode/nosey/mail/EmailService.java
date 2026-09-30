package it.epicode.nosey.mail;

import java.time.Instant;

/**
 * Interfaccia unica per l'invio delle 4 email del progetto (progettazione v4,
 * sezione 0 "Email"), con due implementazioni scelte dal profilo Spring:
 * locale SmtpEmailService (Gmail SMTP) · produzione BrevoEmailService (API HTTP, non ancora fatta).
 * Chi chiama questi metodi lo fa sempre DOPO il commit, in modo @Async: se
 * l'invio fallisce si scrive nel log, la richiesta resta valida.
 */
public interface EmailService {

	void inviaCodiceVerifica(String destinatario, String nome, String codice);

	void inviaTicket(String destinatario, String nome, String titoloEvento, Instant dataEvento, String codiceTicket);

	void inviaCodiceReset(String destinatario, String nome, String codice);

	void inviaPasswordCambiata(String destinatario, String nome);
}
