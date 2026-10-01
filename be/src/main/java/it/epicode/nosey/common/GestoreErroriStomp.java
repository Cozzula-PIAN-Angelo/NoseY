package it.epicode.nosey.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;
import tools.jackson.databind.json.JsonMapper;

/**
 * Frame ERROR mandato al client quando un suo frame fa fallire l'elaborazione (es. CONNECT con
 * un token non valido): dopo il frame ERROR Spring chiude la connessione. Header "message" =
 * codice, corpo = ErroreWebSocket. Il gestore di default ci scriverebbe il messaggio
 * dell'eccezione, con dettagli interni.
 */
@Component
public class GestoreErroriStomp extends StompSubProtocolErrorHandler {

	private static final Logger log = LoggerFactory.getLogger(GestoreErroriStomp.class);

	private final JsonMapper jsonMapper;

	public GestoreErroriStomp(JsonMapper jsonMapper) {
		this.jsonMapper = jsonMapper;
	}

	@Override
	public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> clientMessage, Throwable ex) {
		ErroreWebSocket errore = errore(ex);
		StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.ERROR);
		accessor.setMessage(errore.codice());
		accessor.setContentType(MimeTypeUtils.APPLICATION_JSON);
		accessor.setLeaveMutable(true);
		StompHeaderAccessor clientAccessor = clientMessage != null
				? MessageHeaderAccessor.getAccessor(clientMessage, StompHeaderAccessor.class)
				: null;
		return handleInternal(accessor, jsonMapper.writeValueAsBytes(errore), ex, clientAccessor);
	}

	/** L'ApplicazioneException arriva avvolta in una MessageDeliveryException del canale. */
	private ErroreWebSocket errore(Throwable ex) {
		for (Throwable causa = ex; causa != null; causa = causa.getCause()) {
			if (causa instanceof ApplicazioneException applicazione) {
				return ErroreWebSocket.di(applicazione.getCodiceErrore(), applicazione.getMessage());
			}
		}
		log.error("Errore non gestito su un frame STOMP", ex);
		return ErroreWebSocket.di(CodiceErrore.ERRORE_INTERNO, "Errore interno del server");
	}
}
