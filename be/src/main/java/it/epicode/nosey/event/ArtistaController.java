package it.epicode.nosey.event;

import it.epicode.nosey.common.ImmagineContenuto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/artists")
@RequiredArgsConstructor
public class ArtistaController {

	private final ArtistaService artistaService;

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
