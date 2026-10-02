package it.epicode.nosey.event;

import it.epicode.nosey.common.ImmagineContenuto;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/artists")
@RequiredArgsConstructor
public class ArtistaController {

	private final ArtistaService artistaService;

	@GetMapping
	public List<ArtistaResponse> lista(@RequestParam(required = false) @Size(max = 100) String search) {
		return artistaService.lista(search);
	}

	@GetMapping("/{artistaId}")
	public ArtistaResponse vedi(@PathVariable UUID artistaId) {
		return artistaService.vedi(artistaId);
	}

	// Per le "prossime date" nella scheda artista. Pubblico, vale anche per gli artisti disattivati.
	@GetMapping("/{artistaId}/events")
	public List<EventoMappaResponse> eventi(@PathVariable UUID artistaId) {
		return artistaService.eventi(artistaId);
	}

	/**
	 * Pubblico (decisione 9): un tag img non puo' mandare il token. no-cache + ETag: il browser
	 * ricontrolla ogni volta, e se l'immagine non e' cambiata Spring risponde 304 senza corpo.
	 */
	@GetMapping("/{artistaId}/image")
	public ResponseEntity<byte[]> immagine(@PathVariable UUID artistaId) {
		ImmagineContenuto immagine = artistaService.immagine(artistaId);
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(immagine.contentType()))
				.cacheControl(CacheControl.noCache())
				.eTag(immagine.versione())
				.body(immagine.contenuto());
	}
}
