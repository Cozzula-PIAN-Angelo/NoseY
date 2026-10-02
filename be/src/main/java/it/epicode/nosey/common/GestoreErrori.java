package it.epicode.nosey.common;

import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import org.postgresql.util.PSQLException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Gestisce TUTTE le eccezioni (progettazione v4, sezione 14): nessuna deve
 * arrivare a /error senza passare da qui, e nessuna risposta contiene stack
 * trace o messaggi interni.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class GestoreErrori {

	private static final Logger log = LoggerFactory.getLogger(GestoreErrori.class);

	private final Clock clock;

	@ExceptionHandler(ApplicazioneException.class)
	public ResponseEntity<ErroreResponse> gestisci(ApplicazioneException ex) {
		return risposta(ex.getCodiceErrore(), ex.getMessage(), ex.getCampi());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErroreResponse> gestisci(MethodArgumentNotValidException ex) {
		Map<String, String> campi = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors().forEach(errore ->
				campi.put(errore.getField(), errore.getDefaultMessage()));
		return risposta(CodiceErrore.VALIDAZIONE, "Uno o piu' campi non sono validi", campi);
	}

	@ExceptionHandler(HandlerMethodValidationException.class)
	public ResponseEntity<ErroreResponse> gestisci(HandlerMethodValidationException ex) {
		return risposta(CodiceErrore.VALIDAZIONE, "Uno o piu' parametri non sono validi", Map.of());
	}

	@ExceptionHandler(ConstraintViolationException.class)
	public ResponseEntity<ErroreResponse> gestisci(ConstraintViolationException ex) {
		Map<String, String> campi = new LinkedHashMap<>();
		ex.getConstraintViolations().forEach(violazione ->
				campi.put(violazione.getPropertyPath().toString(), violazione.getMessage()));
		return risposta(CodiceErrore.VALIDAZIONE, "Uno o piu' campi non sono validi", campi);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErroreResponse> gestisci(HttpMessageNotReadableException ex) {
		return risposta(CodiceErrore.VALIDAZIONE, "Corpo della richiesta non leggibile", Map.of());
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ErroreResponse> gestisci(MethodArgumentTypeMismatchException ex) {
		return risposta(CodiceErrore.VALIDAZIONE, "Il parametro '" + ex.getName() + "' non e' valido", Map.of());
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<ErroreResponse> gestisci(MaxUploadSizeExceededException ex) {
		return risposta(CodiceErrore.FILE_NON_VALIDO, "Il file supera la dimensione massima consentita", Map.of());
	}

	// Richiesta multipart malformata su un endpoint di upload: senza questo diventerebbe un 500.
	// MaxUploadSizeExceededException e' una sottoclasse, ma resta al suo handler (piu' specifico).
	@ExceptionHandler(MultipartException.class)
	public ResponseEntity<ErroreResponse> gestisci(MultipartException ex) {
		return risposta(CodiceErrore.FILE_NON_VALIDO, "File non leggibile", Map.of());
	}

	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ErroreResponse> gestisci(NoResourceFoundException ex) {
		return risposta(CodiceErrore.NON_TROVATO, "Risorsa non trovata", Map.of());
	}

	// Un percorso che esiste ma non con quel metodo (es. GET su un percorso solo POST/PATCH/DELETE):
	// senza questo handler specifico finirebbe nel catch-all Exception.class, cioe' un 500.
	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ErroreResponse> gestisci(HttpRequestMethodNotSupportedException ex) {
		return risposta(CodiceErrore.METODO_NON_SUPPORTATO, "Metodo non supportato per questo percorso", Map.of());
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ErroreResponse> gestisci(DataIntegrityViolationException ex) {
		CodiceErrore codice = codiceDaVincolo(nomeVincolo(ex));
		return risposta(codice, "Conflitto con lo stato attuale dei dati", Map.of());
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErroreResponse> gestisci(Exception ex) {
		log.error("Errore inatteso", ex);
		return risposta(CodiceErrore.ERRORE_INTERNO, "Errore interno", Map.of());
	}

	private String nomeVincolo(DataIntegrityViolationException ex) {
		// Prima il nome che PostgreSQL manda in un campo a parte dell'errore: non dipende dalla
		// lingua del server. Hibernate invece lo cerca nel testo del messaggio in inglese, e con
		// un PostgreSQL in italiano non lo trova (decisione 7).
		for (Throwable causa = ex; causa != null; causa = causa.getCause()) {
			if (causa instanceof PSQLException psqlEx
					&& psqlEx.getServerErrorMessage() != null
					&& psqlEx.getServerErrorMessage().getConstraint() != null) {
				return psqlEx.getServerErrorMessage().getConstraint();
			}
		}
		if (ex.getCause() instanceof org.hibernate.exception.ConstraintViolationException hibernateEx) {
			return hibernateEx.getConstraintName();
		}
		return null;
	}

	private CodiceErrore codiceDaVincolo(String nomeVincolo) {
		return switch (nomeVincolo) {
			case "uq_utente_email" -> CodiceErrore.EMAIL_GIA_REGISTRATA;
			case "uq_partecipante" -> CodiceErrore.GIA_ISCRITTO;
			case "pk_artista_evento" -> CodiceErrore.ARTISTA_GIA_ASSOCIATO;
			case "uq_artista_nome" -> CodiceErrore.ARTISTA_NOME_GIA_USATO;
			case null, default -> CodiceErrore.CONFLITTO;
		};
	}

	private ResponseEntity<ErroreResponse> risposta(CodiceErrore codice, String messaggio, Map<String, String> campi) {
		return ResponseEntity.status(codice.getHttpStatus())
				.body(ErroreResponse.di(codice, messaggio, campi, clock.instant()));
	}
}
