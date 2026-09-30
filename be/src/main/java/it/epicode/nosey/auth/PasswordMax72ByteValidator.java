package it.epicode.nosey.auth;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

public class PasswordMax72ByteValidator implements ConstraintValidator<PasswordMax72Byte, String> {

	private static final int MAX_BYTE = 72;

	public static boolean superaLimite(String password) {
		return password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTE;
	}

	@Override
	public boolean isValid(String password, ConstraintValidatorContext context) {
		// null e' compito di @NotBlank.
		return password == null || !superaLimite(password);
	}
}
