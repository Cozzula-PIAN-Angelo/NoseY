package it.epicode.nosey.chat;

import it.epicode.nosey.auth.UtenteAutenticato;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class ChatController {

	private final ChatService chatService;

	@GetMapping
	public List<ChatResponse> lista(@AuthenticationPrincipal UtenteAutenticato utente) {
		return chatService.lista(utente.id());
	}

	// Cursore, non ?page=: before = id del messaggio piu' vecchio gia' caricato (sezione 9).
	@GetMapping("/{chatId}/messages")
	public MessaggiResponse messaggi(@PathVariable UUID chatId,
			@RequestParam(required = false) UUID before,
			@RequestParam(defaultValue = "30") @Min(1) @Max(100) int size,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		return chatService.messaggi(chatId, before, size, utente.id());
	}

	@PatchMapping("/{chatId}/read")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void segnaLetta(@PathVariable UUID chatId, @AuthenticationPrincipal UtenteAutenticato utente) {
		chatService.segnaLetta(chatId, utente.id());
	}
}
