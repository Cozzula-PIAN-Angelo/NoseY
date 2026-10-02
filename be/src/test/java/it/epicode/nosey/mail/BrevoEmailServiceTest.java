package it.epicode.nosey.mail;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.sun.net.httpserver.HttpServer;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Il JSON scambiato con Brevo (/smtp/email), senza chiamate vere: MockRestServiceServer.
 */
class BrevoEmailServiceTest {

	private static final String URL = "https://brevo.test/v3";
	private static final String ENDPOINT = URL + "/smtp/email";

	private RestClient.Builder builder;
	private MockRestServiceServer server;
	private TemplateEngine templateEngine;

	@BeforeEach
	void prepara() {
		builder = RestClient.builder();
		server = MockRestServiceServer.bindTo(builder).build();
		templateEngine = mock(TemplateEngine.class);
		when(templateEngine.process(any(String.class), any(Context.class))).thenReturn("<p>corpo</p>");
	}

	@Test
	void mandaMittenteDestinatarioOggettoECorpoConLaChiaveNellHeader() {
		server.expect(requestTo(ENDPOINT))
				.andExpect(method(HttpMethod.POST))
				.andExpect(header("api-key", "chiave-di-prova"))
				.andExpect(jsonPath("$.sender.name").value("NoseY"))
				.andExpect(jsonPath("$.sender.email").value("noreply@nosey.test"))
				.andExpect(jsonPath("$.to[0].name").value("Mario"))
				.andExpect(jsonPath("$.to[0].email").value("mario@example.com"))
				.andExpect(jsonPath("$.subject").value("NoseY - Conferma la tua email"))
				.andExpect(jsonPath("$.htmlContent").value("<p>corpo</p>"))
				.andRespond(withSuccess("{\"messageId\": \"<1@brevo>\"}", MediaType.APPLICATION_JSON));

		servizio("chiave-di-prova", "noreply@nosey.test").inviaCodiceVerifica("mario@example.com", "Mario", "123456");

		server.verify();
	}

	@Test
	void usaIlTemplateGiustoPerOgniEmail() {
		server.expect(requestTo(ENDPOINT)).andRespond(withSuccess());
		server.expect(requestTo(ENDPOINT)).andExpect(jsonPath("$.subject").value("NoseY - Il tuo ticket per Jazz"))
				.andRespond(withSuccess());
		server.expect(requestTo(ENDPOINT)).andRespond(withSuccess());
		server.expect(requestTo(ENDPOINT)).andRespond(withSuccess());
		BrevoEmailService servizio = servizio("chiave", "noreply@nosey.test");

		servizio.inviaCodiceVerifica("a@example.com", "A", "111111");
		servizio.inviaTicket("a@example.com", "A", "Jazz", Instant.parse("2026-12-01T20:30:00Z"), "TK-1");
		servizio.inviaCodiceReset("a@example.com", "A", "222222");
		servizio.inviaPasswordCambiata("a@example.com", "A");

		org.mockito.Mockito.verify(templateEngine).process(eq("mail/codice-verifica"), any(Context.class));
		org.mockito.Mockito.verify(templateEngine).process(eq("mail/ticket"), any(Context.class));
		org.mockito.Mockito.verify(templateEngine).process(eq("mail/codice-reset"), any(Context.class));
		org.mockito.Mockito.verify(templateEngine).process(eq("mail/password-cambiata"), any(Context.class));
		server.verify();
	}

	@Test
	void erroreHttpNonSiRilancia() {
		server.expect(requestTo(ENDPOINT)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

		assertThatCode(() -> servizio("chiave-sbagliata", "noreply@nosey.test")
				.inviaCodiceVerifica("mario@example.com", "Mario", "123456")).doesNotThrowAnyException();
		server.verify();
	}

	@Test
	void senzaChiaveOMittenteNonChiamaBrevo() {
		servizio("", "noreply@nosey.test").inviaCodiceVerifica("mario@example.com", "Mario", "123456");
		servizio("chiave", "").inviaCodiceVerifica("mario@example.com", "Mario", "123456");

		server.verify();
	}

	@Test
	void seBrevoNonRispondeEntroIlTimeoutL_invioSiInterrompe() throws Exception {
		// Un server locale che accetta la richiesta ma non risponde finche' il test non lo sblocca.
		CountDownLatch fineTest = new CountDownLatch(1);
		HttpServer lento = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
		lento.createContext("/", scambio -> {
			try {
				fineTest.await(10, TimeUnit.SECONDS);
			} catch (InterruptedException ignorata) {
				Thread.currentThread().interrupt();
			}
		});
		lento.start();
		try {
			String url = "http://127.0.0.1:" + lento.getAddress().getPort();
			BrevoEmailService servizio = new BrevoEmailService(templateEngine, url, "chiave", "noreply@nosey.test",
					Duration.ofMillis(300));

			long inizio = System.nanoTime();
			assertThatCode(() -> servizio.inviaCodiceVerifica("mario@example.com", "Mario", "123456"))
					.doesNotThrowAnyException();
			assertThat(Duration.ofNanos(System.nanoTime() - inizio)).isLessThan(Duration.ofSeconds(5));
		} finally {
			fineTest.countDown();
			lento.stop(0);
		}
	}

	private BrevoEmailService servizio(String chiave, String mittente) {
		return new BrevoEmailService(templateEngine, builder, URL, chiave, mittente);
	}
}
