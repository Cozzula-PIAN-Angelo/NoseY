package it.epicode.nosey.auth;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Password NUOVA (registrazione, cambio, reset): al massimo 72 byte in UTF-8, il limite
 * reale di BCrypt, oltre alle regole @Size (progettazione v4, sezione 0) → 400 VALIDAZIONE.
 * Le password da CONTROLLARE non usano questa annotazione: oltre i 72 byte si risponde
 * come per una password errata (PasswordMax72ByteValidator.superaLimite).
 */
@Documented
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordMax72ByteValidator.class)
public @interface PasswordMax72Byte {

	String message() default "non deve superare i 72 byte";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};
}
