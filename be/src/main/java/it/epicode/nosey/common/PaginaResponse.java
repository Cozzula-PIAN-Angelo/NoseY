package it.epicode.nosey.common;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Corpo di risposta per le liste paginate (progettazione v4, sezione 0):
 * mai il Page di Spring serializzato cosi' com'e', il suo JSON non e' garantito stabile.
 * Eccezione: i messaggi di chat usano un cursore (sezione 9), non questa classe.
 */
public record PaginaResponse<T>(
		List<T> contenuto,
		int pagina,
		int dimensione,
		long totaleElementi,
		int totalePagine
) {

	public static <T> PaginaResponse<T> di(Page<T> page) {
		return new PaginaResponse<>(
				page.getContent(),
				page.getNumber(),
				page.getSize(),
				page.getTotalElements(),
				page.getTotalPages()
		);
	}
}
