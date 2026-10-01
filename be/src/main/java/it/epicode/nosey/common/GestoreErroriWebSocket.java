package it.epicode.nosey.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.converter.MessageConversionException;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.web.bind.annotation.ControllerAdvice;

/**
 * Eccezioni dei metodi @MessageMapping (es. InviaMessaggio, sezione 11): l'errore va su
 * /user/queue/errors della sola sessione che ha fatto il SEND, la connessione resta aperta.
 * E' il corrispettivo di GestoreErrori per il WebSocket: mai stack trace né messaggi interni.
 */
@ControllerAdvice
public class GestoreErroriWebSocket {

	private static final Logger log = LoggerFactory.getLogger(GestoreErroriWebSocket.class);

	@MessageExceptionHandler(ApplicazioneException.class)
	@SendToUser(destinations = ErroreWebSocket.CODA, broadcast = false)
	public ErroreWebSocket gestisci(ApplicazioneException ex) {
		return ErroreWebSocket.di(ex.getCodiceErrore(), ex.getMessage());
	}

	@MessageExceptionHandler(MethodArgumentNotValidException.class)
	@SendToUser(destinations = ErroreWebSocket.CODA, broadcast = false)
	public ErroreWebSocket gestisci(MethodArgumentNotValidException ex) {
		return ErroreWebSocket.di(CodiceErrore.VALIDAZIONE, "Uno o piu' campi non sono validi");
	}

	@MessageExceptionHandler(MessageConversionException.class)
	@SendToUser(destinations = ErroreWebSocket.CODA, broadcast = false)
	public ErroreWebSocket gestisci(MessageConversionException ex) {
		return ErroreWebSocket.di(CodiceErrore.VALIDAZIONE, "Corpo del messaggio non leggibile");
	}

	@MessageExceptionHandler(Exception.class)
	@SendToUser(destinations = ErroreWebSocket.CODA, broadcast = false)
	public ErroreWebSocket gestisci(Exception ex) {
		log.error("Errore non gestito su un messaggio WebSocket", ex);
		return ErroreWebSocket.di(CodiceErrore.ERRORE_INTERNO, "Errore interno del server");
	}
}
