package it.epicode.nosey.common;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * «Non vuoto» per i campi facoltativi delle PATCH, dove @NotBlank non si puo'
 * usare: se il campo e' presente deve contenere almeno un carattere che non
 * sia uno spazio (progettazione v4, sezione 0).
 */
@Documented
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = {})
@Pattern(regexp = "(?s).*\\S.*", message = "non deve essere vuoto")
@ReportAsSingleViolation
public @interface NonVuoto {

	String message() default "non deve essere vuoto";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};
}
