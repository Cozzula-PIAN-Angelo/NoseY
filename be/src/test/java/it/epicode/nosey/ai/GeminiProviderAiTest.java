package it.epicode.nosey.ai;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Il JSON scambiato con Gemini (generateContent), senza chiamate vere: MockRestServiceServer.
 */
class GeminiProviderAiTest {

	private static final String URL = "https://gemini.test/v1beta";
	private static final byte[] IMMAGINE = {1, 2, 3, 4};

	private RestClient.Builder builder;
	private MockRestServiceServer server;

	@BeforeEach
	void prepara() {
		builder = RestClient.builder();
		server = MockRestServiceServer.bindTo(builder).build();
	}

	@Test
	void mandaImmagineEDescrizioneELeggeIlTesto() {
		GeminiProviderAi provider = provider("chiave-di-prova");
		server.expect(requestTo(URL + "/models/gemini-test:generateContent"))
				.andExpect(method(HttpMethod.POST))
				.andExpect(header("x-goog-api-key", "chiave-di-prova"))
				.andExpect(jsonPath("$.systemInstruction.parts[0].text").isNotEmpty())
				.andExpect(jsonPath("$.contents[0].parts[0].inlineData.mimeType").value("image/jpeg"))
				.andExpect(jsonPath("$.contents[0].parts[0].inlineData.data")
						.value(Base64.getEncoder().encodeToString(IMMAGINE)))
				.andExpect(jsonPath("$.contents[0].parts[0].text").doesNotExist())
				.andExpect(jsonPath("$.contents[0].parts[1].text").value("Descrizione attuale:\nSerata jazz"))
				.andRespond(withSuccess("""
						{"candidates": [{"content": {"parts": [
						  {"text": "ragionamento interno", "thought": true},
						  {"text": "  Una serata "}, {"text": "di jazz.  "}
						]}, "finishReason": "STOP"}], "usageMetadata": {"totalTokenCount": 10}}
						""", MediaType.APPLICATION_JSON));

		assertThat(provider.migliora(IMMAGINE, "image/jpeg", "Serata jazz")).isEqualTo("Una serata di jazz.");
		server.verify();
	}

	@Test
	void propostaTroppoLungaTagliataA5000() {
		GeminiProviderAi provider = provider("chiave");
		String lungo = "a".repeat(6000);
		server.expect(requestTo(URL + "/models/gemini-test:generateContent"))
				.andRespond(withSuccess("{\"candidates\": [{\"content\": {\"parts\": [{\"text\": \"" + lungo + "\"}]}}]}",
						MediaType.APPLICATION_JSON));

		assertThat(provider.migliora(IMMAGINE, "image/png", "x")).hasSize(GeminiProviderAi.LUNGHEZZA_MASSIMA);
	}

	@Test
	void senzaChiave502SenzaChiamare() {
		assertServizioEsterno(() -> provider("").migliora(IMMAGINE, "image/png", "x"));
		server.verify();
	}

	@Test
	void erroreHttp502() {
		GeminiProviderAi provider = provider("chiave");
		server.expect(requestTo(URL + "/models/gemini-test:generateContent"))
				.andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

		assertServizioEsterno(() -> provider.migliora(IMMAGINE, "image/png", "x"));
	}

	@Test
	void rispostaSenzaTesto502() {
		GeminiProviderAi provider = provider("chiave");
		server.expect(requestTo(URL + "/models/gemini-test:generateContent"))
				.andRespond(withSuccess("{\"candidates\": [{\"finishReason\": \"SAFETY\"}]}", MediaType.APPLICATION_JSON));

		assertServizioEsterno(() -> provider.migliora(IMMAGINE, "image/png", "x"));
	}

	private GeminiProviderAi provider(String chiave) {
		return new GeminiProviderAi(builder, URL, chiave, "gemini-test");
	}

	private void assertServizioEsterno(Executable azione) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, azione);
		assertThat(ex.getCodiceErrore()).isEqualTo(CodiceErrore.SERVIZIO_ESTERNO);
	}
}
