package it.epicode.nosey.user;

import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.PaginaResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Utenti e ruoli (progettazione v4, sezioni 12 e 13). Il ruolo minimo lo controlla SecurityConfig:
 * /api/admin/** → ADMIN (e SUPERADMIN per la gerarchia), /api/superadmin/** → SUPERADMIN.
 */
@Validated
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AdminUtenteController {

	private final AdminUtenteService adminUtenteService;

	// status come enum: un valore che non esiste diventa 400 VALIDAZIONE (GestoreErrori).
	@GetMapping("/admin/users")
	public PaginaResponse<AdminUtenteResponse> lista(@RequestParam(required = false) @Size(max = 100) String search,
			@RequestParam(required = false) StatoUtente status,
			@RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
		return adminUtenteService.lista(search, status, page, size);
	}

	@PatchMapping("/admin/users/{utenteId}/status")
	public AdminUtenteResponse cambiaStato(@PathVariable UUID utenteId,
			@RequestBody @Valid CambiaStatoUtenteRequest richiesta,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		return adminUtenteService.cambiaStato(utenteId, richiesta, utente.id());
	}

	@PatchMapping("/superadmin/users/{utenteId}/role")
	public AdminUtenteResponse cambiaRuolo(@PathVariable UUID utenteId,
			@RequestBody @Valid CambiaRuoloRequest richiesta,
			@AuthenticationPrincipal UtenteAutenticato utente) {
		return adminUtenteService.cambiaRuolo(utenteId, richiesta, utente.id());
	}
}
