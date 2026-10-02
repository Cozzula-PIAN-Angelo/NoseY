package it.epicode.nosey.common;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 405 METODO_NON_SUPPORTATO (progettazione v4, sezione 14): un percorso che esiste ma non con
 * quel metodo (es. GET su un percorso solo POST/PATCH/DELETE) non deve finire nel catch-all
 * Exception.class, altrimenti sarebbe un 500. Test unitario: nessun bean, nessun database.
 */
class GestoreErroriTest {

	private final GestoreErrori gestoreErrori = new GestoreErrori(Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

	@Test
	void metodoNonSupportatoDiventa405() {
		ResponseEntity<ErroreResponse> risposta =
				gestoreErrori.gestisci(new HttpRequestMethodNotSupportedException("GET"));

		assertThat(risposta.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
		assertThat(risposta.getBody().codice()).isEqualTo(CodiceErrore.METODO_NON_SUPPORTATO.name());
		assertThat(risposta.getBody().campi()).isEmpty();
	}
}
