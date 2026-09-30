package it.epicode.nosey.common;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

/**
 * Corpo di risposta per tutti gli errori HTTP (progettazione v4, sezione 0).
 * codice: stringa stabile in MAIUSCOLO, il frontend decide in base a questo, MAI al messaggio.
 * campi: valorizzato solo con VALIDAZIONE · mai stack trace né messaggi interni.
 */
public record ErroreResponse(
		int status,
		String codice,
		String errore,
		String messaggio,
		Map<String, String> campi,
		Instant timestamp
) {

	public ErroreResponse {
		campi = campi == null ? Map.of() : Map.copyOf(campi);
	}

	public static ErroreResponse di(CodiceErrore codiceErrore, String messaggio, Instant adesso) {
		return di(codiceErrore, messaggio, Map.of(), adesso);
	}

	public static ErroreResponse di(CodiceErrore codiceErrore, String messaggio, Map<String, String> campi, Instant adesso) {
		HttpStatus status = codiceErrore.getHttpStatus();
		return new ErroreResponse(status.value(), codiceErrore.name(), status.getReasonPhrase(), messaggio, campi, adesso);
	}
}
