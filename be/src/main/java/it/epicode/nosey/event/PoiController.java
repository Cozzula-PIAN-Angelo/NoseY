package it.epicode.nosey.event;

import it.epicode.nosey.auth.UtenteAutenticato;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events/{id}/pois")
@RequiredArgsConstructor
public class PoiController {

	private final PoiService poiService;

	@GetMapping
	public List<PoiResponse> lista(@PathVariable UUID id) {
		return poiService.lista(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public PoiResponse crea(@PathVariable UUID id, @AuthenticationPrincipal UtenteAutenticato utente,
			@RequestBody @Valid PoiRequest richiesta) {
		return poiService.crea(id, utente.id(), richiesta);
	}

	@PatchMapping("/{poiId}")
	public PoiResponse modifica(@PathVariable UUID id, @PathVariable UUID poiId,
			@AuthenticationPrincipal UtenteAutenticato utente, @RequestBody @Valid ModificaPoiRequest richiesta) {
		return poiService.modifica(id, poiId, utente.id(), richiesta);
	}

	@DeleteMapping("/{poiId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void cancella(@PathVariable UUID id, @PathVariable UUID poiId,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		poiService.cancella(id, poiId, utente.id());
	}
}
