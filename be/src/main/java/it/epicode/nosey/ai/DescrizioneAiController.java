package it.epicode.nosey.ai;

import it.epicode.nosey.auth.UtenteAutenticato;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/events/{id}/description/ai")
@RequiredArgsConstructor
public class DescrizioneAiController {

	private final DescrizioneAiService descrizioneAiService;

	@PostMapping
	public DescrizionePropostaResponse migliora(@PathVariable UUID id, @AuthenticationPrincipal UtenteAutenticato utente,
			@RequestBody @Valid MiglioraDescrizioneRequest richiesta) {
		return descrizioneAiService.migliora(id, utente.id(), richiesta);
	}
}
