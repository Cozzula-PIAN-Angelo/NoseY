package it.epicode.nosey.notification;

import com.fasterxml.jackson.annotation.JsonValue;

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
}
