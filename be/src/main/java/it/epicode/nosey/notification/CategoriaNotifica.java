package it.epicode.nosey.notification;

import com.fasterxml.jackson.annotation.JsonValue;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;

/**
 * Stessi valori nel percorso, in NotificaResponse e nel payload WebSocket
 * (progettazione v4, sezione 10): events | friendships | chats.
 */
public enum CategoriaNotifica {
	EVENTS("events"),
	FRIENDSHIPS("friendships"),
	CHATS("chats");

	private final String valore;

	CategoriaNotifica(String valore) {
		this.valore = valore;
	}

	@JsonValue
	public String valore() {
		return valore;
	}

	/**
	 * Categoria dal percorso o dal parametro ?categoria=. Non si lascia la conversione a Spring:
	 * vorrebbe il nome dell'enum (EVENTS) e un valore errato diventerebbe VALIDAZIONE.
	 */
	public static CategoriaNotifica da(String valore) {
		for (CategoriaNotifica categoria : values()) {
			if (categoria.valore.equals(valore)) {
				return categoria;
			}
		}
		throw new ApplicazioneException(CodiceErrore.CATEGORIA_NON_VALIDA,
				"Categoria non valida: usa events, friendships o chats");
	}
}
