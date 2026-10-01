package it.epicode.nosey.ticket;

import it.epicode.nosey.auth.UtenteAutenticato;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/events/{id}/participants")
@RequiredArgsConstructor
public class PartecipanteController {

	private final PartecipanteService partecipanteService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public TicketResponse iscrivi(@PathVariable UUID id, @AuthenticationPrincipal UtenteAutenticato utente) {
		return partecipanteService.iscrivi(id, utente.id());
	}

	@GetMapping("/me")
	public TicketResponse miaPartecipazione(@PathVariable UUID id, @AuthenticationPrincipal UtenteAutenticato utente) {
		return partecipanteService.miaPartecipazione(id, utente.id());
	}

	@DeleteMapping("/me")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void cancellaPartecipazione(@PathVariable UUID id, @AuthenticationPrincipal UtenteAutenticato utente) {
		partecipanteService.cancellaIscrizione(id, utente.id());
	}
}
