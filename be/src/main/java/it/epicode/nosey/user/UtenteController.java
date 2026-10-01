package it.epicode.nosey.user;

import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.ImmagineContenuto;
import it.epicode.nosey.event.EventoMappaResponse;
import it.epicode.nosey.event.EventoService;
import it.epicode.nosey.ticket.PartecipanteService;
import it.epicode.nosey.ticket.TicketResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UtenteController {

	private final UtenteService utenteService;
	private final EventoService eventoService;
	private final PartecipanteService partecipanteService;

	@GetMapping("/me")
	public UtenteResponse vediProfilo(@AuthenticationPrincipal UtenteAutenticato utente) {
		return utenteService.vediProfilo(utente);
	}

	@PatchMapping("/me")
	public UtenteResponse modificaProfilo(@AuthenticationPrincipal UtenteAutenticato utente,
			@RequestBody @Valid ModificaUtenteRequest richiesta) {
		return utenteService.modificaProfilo(utente, richiesta);
	}

	@PostMapping("/me/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void cambiaPassword(@AuthenticationPrincipal UtenteAutenticato utente,
			@RequestBody @Valid CambioPasswordRequest richiesta) {
		utenteService.cambiaPassword(utente, richiesta);
	}

	// required = false: il file mancante lo segnala StorageService con FILE_NON_VALIDO.
	@PostMapping("/me/avatar")
	public UtenteResponse caricaImmagine(@AuthenticationPrincipal UtenteAutenticato utente,
			@RequestParam(name = "file", required = false) MultipartFile file) {
		return utenteService.caricaImmagine(utente, file);
	}

	@DeleteMapping("/me/avatar")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void rimuoviImmagine(@AuthenticationPrincipal UtenteAutenticato utente) {
		utenteService.rimuoviImmagine(utente);
	}

	@GetMapping("/me/events")
	public List<EventoMappaResponse> mieiEventi(@AuthenticationPrincipal UtenteAutenticato utente) {
		return eventoService.mieiEventi(utente.id());
	}

	@GetMapping("/me/tickets")
	public List<TicketResponse> mieiTicket(@AuthenticationPrincipal UtenteAutenticato utente) {
		return partecipanteService.mieiTicket(utente.id());
	}

	/**
	 * Pubblico (decisione 9): un tag img non puo' mandare il token. no-cache + ETag: il browser
	 * ricontrolla ogni volta, e se l'immagine non e' cambiata Spring risponde 304 senza corpo.
	 */
	@GetMapping("/{utenteId}/avatar")
	public ResponseEntity<byte[]> immagine(@PathVariable UUID utenteId) {
		ImmagineContenuto immagine = utenteService.immagine(utenteId);
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(immagine.contentType()))
				.cacheControl(CacheControl.noCache())
				.eTag(immagine.versione())
				.body(immagine.contenuto());
	}
}
