package it.epicode.nosey.auth;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.ErroreWebSocket;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.UtenteRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Optional;
import java.util.Set;

/**
 * Sicurezza del WebSocket (progettazione v4, sezione 11), sui frame in arrivo dal client.
 * CONNECT: token nell'header Authorization, utente ATTIVO; il Principal della sessione e'
 * l'UtenteAutenticato (nome = id dell'utente, piu' jti e scadenza per i controlli a ogni SEND).
 * SEND solo verso /app/**, SUBSCRIBE solo verso le tre code dell'utente: senza queste regole un
 * client potrebbe fare SEND a /user/{id}/queue/... e recapitare messaggi falsi a quell'utente.
 */
@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

	private static final String PREFISSO = "Bearer ";
	private static final String PREFISSO_APP = "/app/";
	private static final Set<String> CODE_UTENTE = Set.of(
			"/user/queue/messages", "/user/queue/notifications", "/user/queue/errors");

	private final TokenService tokenService;
	private final UtenteRepository utenteRepository;
	// Lazy: il template nasce dalla stessa configurazione che registra questo interceptor.
	private final ObjectProvider<SimpMessagingTemplate> messagingTemplate;

	public JwtChannelInterceptor(TokenService tokenService, UtenteRepository utenteRepository,
			ObjectProvider<SimpMessagingTemplate> messagingTemplate) {
		this.tokenService = tokenService;
		this.utenteRepository = utenteRepository;
		this.messagingTemplate = messagingTemplate;
	}

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
		if (accessor == null || accessor.getCommand() == null) {
			return message;
		}
		return switch (accessor.getCommand()) {
			case CONNECT, STOMP -> {
				accessor.setUser(autentica(accessor));
				yield message;
			}
			case SEND -> {
				String destinazione = accessor.getDestination();
				yield filtra(message, accessor, destinazione != null && destinazione.startsWith(PREFISSO_APP),
						"SEND non ammesso verso " + destinazione);
			}
			case SUBSCRIBE -> {
				String destinazione = accessor.getDestination();
				yield filtra(message, accessor, CODE_UTENTE.contains(destinazione),
						"SUBSCRIBE non ammesso verso " + destinazione);
			}
			default -> message;
		};
	}

	/** Token non valido: l'eccezione diventa un frame ERROR e la connessione viene chiusa. */
	private UtenteAutenticato autentica(StompHeaderAccessor accessor) {
		return Optional.ofNullable(accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION))
				.filter(header -> header.startsWith(PREFISSO))
				.flatMap(header -> tokenService.verifica(header.substring(PREFISSO.length()).strip()))
				.filter(utente -> utenteRepository.existsByIdAndStato(utente.id(), StatoUtente.ATTIVO))
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.TOKEN_NON_VALIDO,
						"Token mancante, scaduto o revocato"));
	}

	/**
	 * Destinazione non ammessa: il frame viene scartato (null) e l'errore va su /user/queue/errors
	 * della sola sessione che l'ha mandato, senza chiudere la connessione.
	 */
	private Message<?> filtra(Message<?> message, StompHeaderAccessor accessor, boolean ammessa, String messaggio) {
		Principal utente = accessor.getUser();
		if (utente == null) {
			// SEND o SUBSCRIBE senza un CONNECT valido.
			throw new ApplicazioneException(CodiceErrore.TOKEN_NON_VALIDO, "Token mancante, scaduto o revocato");
		}
		if (ammessa) {
			return message;
		}
		SimpMessageHeaderAccessor intestazioni = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
		intestazioni.setSessionId(accessor.getSessionId());
		intestazioni.setLeaveMutable(true);
		messagingTemplate.getObject().convertAndSendToUser(utente.getName(), ErroreWebSocket.CODA,
				ErroreWebSocket.di(CodiceErrore.ACCESSO_NEGATO, messaggio), intestazioni.getMessageHeaders());
		return null;
	}
}
