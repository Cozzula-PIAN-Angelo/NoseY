package it.epicode.nosey.notification;

import it.epicode.nosey.user.Utente;

import java.time.Instant;
import java.util.UUID;

/**
 * Notifica nelle liste e nel push live (progettazione v4, sezione 10).
 * riferimentoId: evento (events), amicizia (friendships), chat (chats).
 */
public record NotificaResponse(
		UUID id,
		CategoriaNotifica categoria,
		String tipo,
		String testo,
		UUID riferimentoId,
		boolean letta,
		Instant creataIl
) {

	public static NotificaResponse da(NotificaEvento notifica) {
		return new NotificaResponse(
				notifica.getId(),
				CategoriaNotifica.EVENTS,
				notifica.getTipo().name(),
				notifica.getTesto(),
				notifica.getEvento().getId(),
				notifica.isLetta(),
				notifica.getCreataIl());
	}

	/**
	 * Il testo non e' salvato: si genera con il nome ATTUALE dell'altro utente della coppia,
	 * cosi' dopo un'anonimizzazione compare il nome anonimo anche nelle notifiche gia' ricevute.
	 */
	public static NotificaResponse da(NotificaAmicizia notifica) {
		Utente destinatario = notifica.getDestinatario();
		Utente richiedente = notifica.getAmicizia().getRichiedente();
		Utente altro = richiedente.getId().equals(destinatario.getId())
				? notifica.getAmicizia().getRicevente()
				: richiedente;
		String nome = altro.getNome() + " " + altro.getCognome();
		String testo = switch (notifica.getTipo()) {
			case RICHIESTA -> nome + " ti ha chiesto l'amicizia";
			case ACCETTATA -> nome + " ha accettato la tua richiesta di amicizia";
		};
		return new NotificaResponse(
				notifica.getId(),
				CategoriaNotifica.FRIENDSHIPS,
				notifica.getTipo().name(),
				testo,
				notifica.getAmicizia().getId(),
				notifica.isLetta(),
				notifica.getCreataIl());
	}
}
