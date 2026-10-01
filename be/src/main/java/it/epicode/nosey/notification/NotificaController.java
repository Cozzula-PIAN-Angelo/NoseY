package it.epicode.nosey.notification;

import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.PaginaResponse;
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
import java.util.Map;
import java.util.UUID;

// La categoria arriva come String: la valida il service, per rispondere CATEGORIA_NON_VALIDA.
@Validated
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificaController {

	private final NotificheLetturaService notificheLetturaService;

	@GetMapping("/events")
	public PaginaResponse<NotificaResponse> eventi(@RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		return notificheLetturaService.listaEventi(utente.id(), page, size);
	}

	@GetMapping("/friendships")
	public PaginaResponse<NotificaResponse> amicizie(@RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		return notificheLetturaService.listaAmicizie(utente.id(), page, size);
	}

	@GetMapping("/chats")
	public List<NotificaResponse> chat(@AuthenticationPrincipal UtenteAutenticato utente) {
		return notificheLetturaService.listaChat(utente.id());
	}

	@GetMapping("/unread-count")
	public Map<String, Long> contaNonLette(@AuthenticationPrincipal UtenteAutenticato utente) {
		return notificheLetturaService.contaNonLette(utente.id());
	}

	@PatchMapping("/{categoria}/{notificaId}/read")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void segnaLetta(@PathVariable String categoria, @PathVariable UUID notificaId,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		notificheLetturaService.segnaLetta(categoria, notificaId, utente.id());
	}

	@PatchMapping("/read-all")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void segnaTutteLette(@RequestParam(required = false) String categoria,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		notificheLetturaService.segnaTutteLette(categoria, utente.id());
	}
}
