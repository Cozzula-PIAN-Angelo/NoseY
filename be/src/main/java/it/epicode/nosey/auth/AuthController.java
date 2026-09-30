package it.epicode.nosey.auth;

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
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	public RegisterResponse registra(@RequestBody @Valid RegisterRequest richiesta) {
		return authService.registra(richiesta);
	}

	@PostMapping("/verify")
	public LoginResponse verifica(@RequestBody @Valid VerifyRequest richiesta) {
		return authService.verifica(richiesta);
	}

	@PostMapping("/resend-code")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void reinviaCodice(@RequestBody @Valid EmailRequest richiesta) {
		authService.reinviaCodice(richiesta);
	}

	@PostMapping("/login")
	public LoginResponse login(@RequestBody @Valid LoginRequest richiesta) {
		return authService.login(richiesta);
	}

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void logout(@AuthenticationPrincipal UtenteAutenticato utente) {
		authService.logout(utente);
	}

	@PostMapping("/password/forgot")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void passwordDimenticata(@RequestBody @Valid EmailRequest richiesta) {
		authService.passwordDimenticata(richiesta);
	}

	@PostMapping("/password/reset")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void reimpostaPassword(@RequestBody @Valid ReimpostaPasswordRequest richiesta) {
		authService.reimpostaPassword(richiesta);
	}
}
