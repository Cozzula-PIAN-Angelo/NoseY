package it.epicode.nosey.event;

import it.epicode.nosey.auth.UtenteAutenticato;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventoController {

	private final EventoService eventoService;

	// Pubblico. lat/lng facoltativi (insieme o nessuno: controllato nel service);
	// il frontend li arrotonda a 2 decimali prima di chiamare (sezione 3).
	@GetMapping
	public List<EventoMappaResponse> lista(
			@RequestParam(required = false) @DecimalMin("-90") @DecimalMax("90") Double lat,
			@RequestParam(required = false) @DecimalMin("-180") @DecimalMax("180") Double lng) {
		return eventoService.listaMappa(lat, lng);
	}

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
