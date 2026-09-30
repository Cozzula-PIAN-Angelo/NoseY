package it.epicode.nosey.mail;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Gmail SMTP con password per le app, per l'invio reale in locale (profilo
 * "smtp", decisione 3). I corpi sono template Thymeleaf in templates/mail/.
 */
@Service
@Profile("smtp")
@RequiredArgsConstructor
@Slf4j
public class SmtpEmailService implements EmailService {

	private static final DateTimeFormatter FORMATO_DATA =
			DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneOffset.UTC);

	private final JavaMailSender mailSender;
	private final TemplateEngine templateEngine;

	@Override
	public void inviaCodiceVerifica(String destinatario, String nome, String codice) {
		Context contesto = new Context();
		contesto.setVariable("nome", nome);
		contesto.setVariable("codice", codice);
		invia(destinatario, "NoseY - Conferma la tua email", "mail/codice-verifica", contesto);
	}

	@Override
	public void inviaTicket(String destinatario, String nome, String titoloEvento, Instant dataEvento, String codiceTicket) {
		Context contesto = new Context();
		contesto.setVariable("nome", nome);
		contesto.setVariable("titoloEvento", titoloEvento);
		contesto.setVariable("dataEvento", FORMATO_DATA.format(dataEvento));
		contesto.setVariable("codiceTicket", codiceTicket);
		invia(destinatario, "NoseY - Il tuo ticket per " + titoloEvento, "mail/ticket", contesto);
	}

	@Override
	public void inviaCodiceReset(String destinatario, String nome, String codice) {
		Context contesto = new Context();
		contesto.setVariable("nome", nome);
		contesto.setVariable("codice", codice);
		invia(destinatario, "NoseY - Reimposta la tua password", "mail/codice-reset", contesto);
	}

	@Override
	public void inviaPasswordCambiata(String destinatario, String nome) {
		Context contesto = new Context();
		contesto.setVariable("nome", nome);
		invia(destinatario, "NoseY - Password cambiata", "mail/password-cambiata", contesto);
	}

	private void invia(String destinatario, String oggetto, String template, Context contesto) {
		try {
			String html = templateEngine.process(template, contesto);
			MimeMessage messaggio = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(messaggio, "UTF-8");
			helper.setTo(destinatario);
			helper.setSubject(oggetto);
			helper.setText(html, true);
			mailSender.send(messaggio);
		} catch (Exception e) {
			// Se l'invio fallisce si scrive nel log: la richiesta resta valida (sezione 0).
			log.error("Invio email fallito verso {}", destinatario, e);
		}
	}
}
