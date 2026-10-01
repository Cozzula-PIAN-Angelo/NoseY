package it.epicode.nosey.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * Catalogo degli artisti lato ADMIN (progettazione v4, sezione 12).
 * Il ruolo minimo lo controlla SecurityConfig: /api/admin/** → ADMIN (e SUPERADMIN per la gerarchia).
 */
@Validated
@RestController
@RequestMapping("/api/admin/artists")
@RequiredArgsConstructor
public class AdminArtistaController {

	private final AdminArtistaService adminArtistaService;

	// required = false sul file: il caso senza immagine e' valido, non e' obbligatoria alla creazione.
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ArtistaResponse crea(@RequestParam @NotBlank @Size(max = 100) String nome,
			@RequestParam(required = false) MultipartFile file) {
		return adminArtistaService.crea(nome, file);
	}

	// Multipart: tutti i campi facoltativi come parametri, non un body JSON (serve poter allegare un file).
	@PatchMapping("/{artistaId}")
	public ArtistaResponse modifica(@PathVariable UUID artistaId,
			@RequestParam(required = false) @Size(max = 100) String nome,
			@RequestParam(required = false) Boolean attivo,
			@RequestParam(required = false) MultipartFile file) {
		return adminArtistaService.modifica(artistaId, nome, attivo, file);
	}

	@DeleteMapping("/{artistaId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void elimina(@PathVariable UUID artistaId) {
		adminArtistaService.elimina(artistaId);
	}
}
