package it.epicode.nosey.notification;

/**
 * Parti di un evento che producono una notifica MODIFICA (progettazione v4, sezione 10 e D10).
 * Le foto non ci sono: non notificano i partecipanti.
 * L'ordine qui sotto e' quello in cui compaiono nel testo ("date, luogo").
 */
public enum ParteEvento {
	TITOLO("titolo"),
	DESCRIZIONE("descrizione"),
	DATE("date"),
	LUOGO("luogo"),
	ARTISTI("artisti"),
	MAPPA_INTERNA("mappa interna");

	private final String etichetta;

	ParteEvento(String etichetta) {
		this.etichetta = etichetta;
	}

	public String etichetta() {
		return etichetta;
	}
}
