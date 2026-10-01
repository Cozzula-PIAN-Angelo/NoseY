package it.epicode.nosey.friendship;

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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/friendships")
@RequiredArgsConstructor
public class AmiciziaController {

	private final AmiciziaService amiciziaService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public AmiciziaResponse richiedi(@RequestBody @Valid RichiediAmiciziaRequest richiesta,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		return amiciziaService.richiedi(richiesta, utente.id());
	}

	@GetMapping
	public List<AmiciziaResponse> amici(@AuthenticationPrincipal UtenteAutenticato utente) {
		return amiciziaService.amici(utente.id());
	}

	@GetMapping("/requests")
	public List<AmiciziaResponse> richiesteRicevute(@AuthenticationPrincipal UtenteAutenticato utente) {
		return amiciziaService.richiesteRicevute(utente.id());
	}

	@GetMapping("/requests/sent")
	public List<AmiciziaResponse> richiesteInviate(@AuthenticationPrincipal UtenteAutenticato utente) {
		return amiciziaService.richiesteInviate(utente.id());
	}

	@PostMapping("/{amiciziaId}/accept")
	public AmiciziaResponse accetta(@PathVariable UUID amiciziaId,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		return amiciziaService.accetta(amiciziaId, utente.id());
	}

	@PostMapping("/{amiciziaId}/reject")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void rifiuta(@PathVariable UUID amiciziaId, @AuthenticationPrincipal UtenteAutenticato utente) {
		amiciziaService.rifiuta(amiciziaId, utente.id());
	}

	@PostMapping("/{amiciziaId}/withdraw")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void ritira(@PathVariable UUID amiciziaId, @AuthenticationPrincipal UtenteAutenticato utente) {
		amiciziaService.ritira(amiciziaId, utente.id());
	}

	@PostMapping("/{amiciziaId}/remove")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void rimuovi(@PathVariable UUID amiciziaId, @AuthenticationPrincipal UtenteAutenticato utente) {
		amiciziaService.rimuovi(amiciziaId, utente.id());
	}
}
