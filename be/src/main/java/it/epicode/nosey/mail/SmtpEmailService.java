package it.epicode.nosey.mail;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;

/**
 * Gmail SMTP con password per le app, per l'invio reale in locale (profilo
 * "smtp", decisione 3). I corpi sono template Thymeleaf in templates/mail/.
 */
@Service
@Profile("smtp")
@Slf4j
public class SmtpEmailService extends EmailHtmlService {

	private final JavaMailSender mailSender;

	public SmtpEmailService(TemplateEngine templateEngine, JavaMailSender mailSender) {
		super(templateEngine);
		this.mailSender = mailSender;
	}

	@Override
	protected void invia(String destinatario, String nome, String oggetto, String html) {
		try {
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
