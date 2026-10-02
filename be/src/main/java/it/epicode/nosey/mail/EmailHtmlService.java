package it.epicode.nosey.mail;

import lombok.RequiredArgsConstructor;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Parte comune delle implementazioni che inviano davvero (Gmail SMTP e Brevo): oggetto e
 * corpo HTML delle 4 email, con i template Thymeleaf in templates/mail/. Le sottoclassi
 * implementano solo il trasporto in invia(). Se l'invio fallisce si scrive nel log e la
 * richiesta resta valida (sezione 0): invia() non deve lanciare eccezioni.
 */
@RequiredArgsConstructor
abstract class EmailHtmlService implements EmailService {

	private static final DateTimeFormatter FORMATO_DATA =
			DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneOffset.UTC);

	private final TemplateEngine templateEngine;

	@Override
	public void inviaCodiceVerifica(String destinatario, String nome, String codice) {
		Context contesto = new Context();
		contesto.setVariable("nome", nome);
		contesto.setVariable("codice", codice);
		invia(destinatario, nome, "NoseY - Conferma la tua email", html("mail/codice-verifica", contesto));
	}

	@Override
	public void inviaTicket(String destinatario, String nome, String titoloEvento, Instant dataEvento, String codiceTicket) {
		Context contesto = new Context();
		contesto.setVariable("nome", nome);
		contesto.setVariable("titoloEvento", titoloEvento);
		contesto.setVariable("dataEvento", FORMATO_DATA.format(dataEvento));
		contesto.setVariable("codiceTicket", codiceTicket);
		invia(destinatario, nome, "NoseY - Il tuo ticket per " + titoloEvento, html("mail/ticket", contesto));
	}

	@Override
	public void inviaCodiceReset(String destinatario, String nome, String codice) {
		Context contesto = new Context();
		contesto.setVariable("nome", nome);
		contesto.setVariable("codice", codice);
		invia(destinatario, nome, "NoseY - Reimposta la tua password", html("mail/codice-reset", contesto));
	}

	@Override
	public void inviaPasswordCambiata(String destinatario, String nome) {
		Context contesto = new Context();
		contesto.setVariable("nome", nome);
		invia(destinatario, nome, "NoseY - Password cambiata", html("mail/password-cambiata", contesto));
	}

	private String html(String template, Context contesto) {
		return templateEngine.process(template, contesto);
	}

	/** Spedisce l'email gia' pronta. Gli errori vanno nel log, non si rilanciano. */
	protected abstract void invia(String destinatario, String nome, String oggetto, String html);
}
