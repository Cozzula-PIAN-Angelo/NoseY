package it.epicode.nosey.mail;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.thymeleaf.TemplateEngine;

import java.util.List;

/**
 * Brevo via API HTTP (POST /v3/smtp/email), per la produzione (profilo "prod", decisione 12):
 * Render gratuito blocca le porte SMTP, HTTPS no. La chiave sta solo nel backend
 * (BREVO_API_KEY) e va nell'header api-key. Il mittente (MAIL_FROM) deve essere un
 * indirizzo confermato nell'account Brevo.
 */
@Service
@Profile("prod")
@Slf4j
public class BrevoEmailService extends EmailHtmlService {

	private static final String NOME_MITTENTE = "NoseY";

	private final RestClient restClient;
	private final String apiKey;
	private final String mittente;

	@Autowired
	public BrevoEmailService(TemplateEngine templateEngine, @Value("${app.mail.brevo.url}") String url,
			@Value("${app.mail.brevo.api-key}") String apiKey, @Value("${app.mail.from}") String mittente) {
		this(templateEngine, RestClient.builder(), url, apiKey, mittente);
	}

	// Per i test: un builder legato a MockRestServiceServer.
	BrevoEmailService(TemplateEngine templateEngine, RestClient.Builder builder, String url, String apiKey,
			String mittente) {
		super(templateEngine);
		this.restClient = builder.baseUrl(url).build();
		this.apiKey = apiKey;
		this.mittente = mittente;
	}

	@Override
	protected void invia(String destinatario, String nome, String oggetto, String html) {
		if (apiKey == null || apiKey.isBlank() || mittente == null || mittente.isBlank()) {
			log.error("BREVO_API_KEY o MAIL_FROM non impostate: email non inviata a {}", destinatario);
			return;
		}
		Richiesta richiesta = new Richiesta(new Indirizzo(NOME_MITTENTE, mittente),
				List.of(new Indirizzo(nome, destinatario)), oggetto, html);
		try {
			restClient.post()
					.uri("/smtp/email")
					.header("api-key", apiKey)
					.contentType(MediaType.APPLICATION_JSON)
					.body(richiesta)
					.retrieve()
					.toBodilessEntity();
		} catch (RestClientException e) {
			// Errore HTTP (chiave non valida, mittente non confermato, quota finita...) o rete.
			// Niente rilancio e niente corpo della richiesta nel log: contiene il codice appena generato.
			log.error("Invio email fallito verso {}: {}", destinatario, e.getMessage());
		}
	}

	// --- JSON di /smtp/email (solo i campi usati; i null non vengono inviati) ---

	@JsonInclude(JsonInclude.Include.NON_NULL)
	record Richiesta(Indirizzo sender, List<Indirizzo> to, String subject, String htmlContent) {
	}

	@JsonInclude(JsonInclude.Include.NON_NULL)
	record Indirizzo(String name, String email) {
	}
}
