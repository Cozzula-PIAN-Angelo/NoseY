package it.epicode.nosey.common;

import java.util.Map;

/**
 * Eccezione applicativa: porta con sé il CodiceErrore (da cui si ricava lo
 * stato HTTP) e, quando serve, i campi non validi (solo per VALIDAZIONE).
 */
public class ApplicazioneException extends RuntimeException {

	private final CodiceErrore codiceErrore;
	private final Map<String, String> campi;

	public ApplicazioneException(CodiceErrore codiceErrore, String messaggio) {
		this(codiceErrore, messaggio, Map.of());
	}

	public ApplicazioneException(CodiceErrore codiceErrore, String messaggio, Map<String, String> campi) {
		super(messaggio);
		this.codiceErrore = codiceErrore;
		this.campi = campi == null ? Map.of() : Map.copyOf(campi);
	}

	public CodiceErrore getCodiceErrore() {
		return codiceErrore;
	}

	public Map<String, String> getCampi() {
		return campi;
	}
}
