package it.epicode.nosey.notification;

import it.epicode.nosey.chat.Chat;
import it.epicode.nosey.friendship.Amicizia;
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

	/** Unico tipo delle notifiche chats: NOTIFICA_CHAT non ha una colonna tipo. */
	public static final String TIPO_CHAT = "NUOVI_MESSAGGI";

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
		String nome = nomeDellAltro(notifica.getAmicizia(), notifica.getDestinatario());
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

	/**
	 * Come per le amicizie, il testo si genera alla lettura con il nome attuale dell'altro utente.
	 * creataIl = aggiornata_il: l'ultimo messaggio che ha riaperto la notifica.
	 */
	public static NotificaResponse da(NotificaChat notifica) {
		Chat chat = notifica.getChat();
		return new NotificaResponse(
				notifica.getId(),
				CategoriaNotifica.CHATS,
				TIPO_CHAT,
				"Nuovi messaggi da " + nomeDellAltro(chat.getAmicizia(), notifica.getDestinatario()),
				chat.getId(),
				notifica.isLetta(),
				notifica.getAggiornataIl());
	}

	private static String nomeDellAltro(Amicizia amicizia, Utente destinatario) {
		Utente richiedente = amicizia.getRichiedente();
		Utente altro = richiedente.getId().equals(destinatario.getId()) ? amicizia.getRicevente() : richiedente;
		return altro.getNome() + " " + altro.getCognome();
	}
}
