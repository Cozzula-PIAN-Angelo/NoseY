package it.epicode.nosey.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Versione finta di EmailService: scrive un riepilogo nel log invece di
 * inviare davvero, per poter sviluppare senza credenziali SMTP (decisione 3).
 * E' il default: si disattiva con il profilo "smtp" (SmtpEmailService) o "prod" (BrevoEmailService).
 */
@Service
@Profile("!smtp & !prod")
@Slf4j
public class LogEmailService implements EmailService {

	@Override
	public void inviaCodiceVerifica(String destinatario, String nome, String codice) {
		log.info("[EMAIL FINTA] Codice di verifica -> {} ({}): codice={}", nome, destinatario, codice);
	}

	@Override
	public void inviaTicket(String destinatario, String nome, String titoloEvento, Instant dataEvento, String codiceTicket) {
		log.info("[EMAIL FINTA] Ticket -> {} ({}): evento='{}', dataEvento={}, codiceTicket={}",
				nome, destinatario, titoloEvento, dataEvento, codiceTicket);
	}

	@Override
	public void inviaCodiceReset(String destinatario, String nome, String codice) {
		log.info("[EMAIL FINTA] Codice di reset password -> {} ({}): codice={}", nome, destinatario, codice);
	}

	@Override
	public void inviaPasswordCambiata(String destinatario, String nome) {
		log.info("[EMAIL FINTA] Password cambiata -> {} ({})", nome, destinatario);
	}
}
