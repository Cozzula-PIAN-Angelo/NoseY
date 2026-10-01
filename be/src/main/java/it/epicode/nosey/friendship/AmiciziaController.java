package it.epicode.nosey.friendship;

import it.epicode.nosey.auth.UtenteAutenticato;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

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
}
