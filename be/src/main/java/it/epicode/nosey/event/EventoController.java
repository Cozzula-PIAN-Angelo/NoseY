package it.epicode.nosey.event;

import it.epicode.nosey.auth.UtenteAutenticato;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventoController {

	private final EventoService eventoService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public EventoDettaglioResponse crea(@AuthenticationPrincipal UtenteAutenticato utente,
			@RequestBody @Valid EventoRequest richiesta) {
		return eventoService.crea(richiesta, utente.id());
	}

	// Pubblico: con un token valido (facoltativo) calcola sonoProprietario/sonoIscritto.
	// Un token scaduto o non valido non da' mai 401 qui (JwtFilter, sezione 14): utente = null.
	@GetMapping("/{id}")
	public EventoDettaglioResponse vedi(@PathVariable UUID id,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		return eventoService.vedi(id, utente == null ? null : utente.id());
	}
}
