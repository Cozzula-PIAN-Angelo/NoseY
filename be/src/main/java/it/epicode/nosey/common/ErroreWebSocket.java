package it.epicode.nosey.common;

/**
 * Corpo degli errori sul WebSocket (progettazione v4, sezioni 0 e 11): arriva su
 * /user/queue/errors, oppure nel frame ERROR quando la connessione viene chiusa.
 * Niente status HTTP: sul WebSocket il frontend decide solo in base al codice.
 */
public record ErroreWebSocket(String codice, String messaggio) {

	/** Coda degli errori, relativa al prefisso /user (il client fa SUBSCRIBE a /user/queue/errors). */
	public static final String CODA = "/queue/errors";

	public static ErroreWebSocket di(CodiceErrore codiceErrore, String messaggio) {
		return new ErroreWebSocket(codiceErrore.name(), messaggio);
	}
}
