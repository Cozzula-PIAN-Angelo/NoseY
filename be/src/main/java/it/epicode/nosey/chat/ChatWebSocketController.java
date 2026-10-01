package it.epicode.nosey.chat;

import it.epicode.nosey.auth.UtenteAutenticato;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.util.UUID;

/**
 * InviaMessaggio: SEND /app/chats/{chatId}/send (sezione 11). Niente risposta diretta: il messaggio
 * arriva ai due utenti su /user/queue/messages, gli errori su /user/queue/errors (GestoreErroriWebSocket).
 */
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

	private final ChatService chatService;

	// Senza @Valid e non obbligatorio: corpo vuoto o non valido e' il terzo controllo, dopo token
	// e limite (decisione 17).
	@MessageMapping("/chats/{chatId}/send")
	public void invia(@DestinationVariable UUID chatId, @Payload(required = false) InviaMessaggioRequest richiesta,
			UtenteAutenticato utente) {
		chatService.invia(chatId, richiesta, utente);
	}
}
