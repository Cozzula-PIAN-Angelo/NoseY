package it.epicode.nosey.event;

import it.epicode.nosey.auth.UtenteAutenticato;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Moderazione degli eventi lato ADMIN (progettazione v4, sezione 12).
 * Il ruolo minimo lo controlla SecurityConfig: /api/admin/** → ADMIN (e SUPERADMIN per la gerarchia).
 */
@RestController
@RequestMapping("/api/admin/events")
@RequiredArgsConstructor
public class AdminEventoController {

	private final AdminEventoService adminEventoService;

	@DeleteMapping("/{id}/photos/{fotoId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void rimuoviFoto(@PathVariable UUID id, @PathVariable UUID fotoId,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		adminEventoService.rimuoviFoto(id, fotoId, utente.id());
	}

	@PostMapping("/{id}/cancel")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void annulla(@PathVariable UUID id, @RequestBody @Valid AnnullaEventoModerazioneRequest richiesta,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		adminEventoService.annulla(id, richiesta.motivo(), utente.id());
	}
}
