package it.epicode.nosey.event;

import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.ImmagineContenuto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
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

@Validated
@RestController
@RequestMapping("/api/events/{id}/photos")
@RequiredArgsConstructor
public class FotoController {

	private final FotoService fotoService;

	@GetMapping
	public List<FotoResponse> lista(@PathVariable UUID id) {
		return fotoService.lista(id);
	}

	// required = false: il file mancante lo segnala StorageService con FILE_NON_VALIDO.
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public FotoResponse crea(@PathVariable UUID id, @AuthenticationPrincipal UtenteAutenticato utente,
			@RequestParam(name = "file", required = false) MultipartFile file,
			@RequestParam(required = false) @Size(max = 150) String didascalia) {
		return fotoService.crea(id, utente.id(), file, didascalia);
	}

	@PatchMapping("/{fotoId}")
	public FotoResponse modifica(@PathVariable UUID id, @PathVariable UUID fotoId,
			@AuthenticationPrincipal UtenteAutenticato utente, @RequestBody @Valid ModificaFotoRequest richiesta) {
		return fotoService.modifica(id, fotoId, utente.id(), richiesta);
	}

	@DeleteMapping("/{fotoId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void cancella(@PathVariable UUID id, @PathVariable UUID fotoId,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		fotoService.cancella(id, fotoId, utente.id());
	}

	/**
	 * Pubblico (decisione 9): un tag img non puo' mandare il token. no-cache + ETag: il browser
	 * ricontrolla ogni volta, e se l'immagine non e' cambiata Spring risponde 304 senza corpo.
	 */
	@GetMapping("/{fotoId}/image")
	public ResponseEntity<byte[]> immagine(@PathVariable UUID id, @PathVariable UUID fotoId) {
		ImmagineContenuto immagine = fotoService.immagine(id, fotoId);
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(immagine.contentType()))
				.cacheControl(CacheControl.noCache())
				.eTag(immagine.versione())
				.body(immagine.contenuto());
	}
}
