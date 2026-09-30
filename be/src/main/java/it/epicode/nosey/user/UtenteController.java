package it.epicode.nosey.user;

import it.epicode.nosey.auth.UtenteAutenticato;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UtenteController {

	private final UtenteService utenteService;

	@GetMapping
	public UtenteResponse vediProfilo(@AuthenticationPrincipal UtenteAutenticato utente) {
		return utenteService.vediProfilo(utente);
	}

	@PatchMapping
	public UtenteResponse modificaProfilo(@AuthenticationPrincipal UtenteAutenticato utente,
			@RequestBody @Valid ModificaUtenteRequest richiesta) {
		return utenteService.modificaProfilo(utente, richiesta);
	}

	@PostMapping("/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void cambiaPassword(@AuthenticationPrincipal UtenteAutenticato utente,
			@RequestBody @Valid CambioPasswordRequest richiesta) {
		utenteService.cambiaPassword(utente, richiesta);
	}
}
