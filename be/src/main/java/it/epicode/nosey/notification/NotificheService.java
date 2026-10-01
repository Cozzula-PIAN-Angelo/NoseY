package it.epicode.nosey.notification;

import it.epicode.nosey.event.Evento;
import it.epicode.nosey.friendship.Amicizia;

import java.util.Set;

/**
 * Contratto TEAM-02 per creare le notifiche (progettazione v4, sezione 10).
 * Si chiama DENTRO la transazione di chi modifica i dati: le notifiche si salvano con il resto,
 * l'invio live parte solo dopo il commit (NotificaLiveEvent).
 * I testi salvati non contengono MAI nomi di persone.
 */
public interface NotificheService {

	/**
	 * MODIFICA a ogni partecipante, accorpata: chi ha gia' una MODIFICA non letta per questo evento
	 * non ne riceve una nuova, si aggiorna quella. Le parti vuote non notificano nessuno.
	 */
	void notificaModifica(Evento evento, Set<ParteEvento> parti);

	/**
	 * ISCRIZIONE al proprietario, accorpata, con il numero attuale di partecipanti.
	 * Da chiamare dopo aver salvato il nuovo Partecipante.
	 */
	void notificaIscrizione(Evento evento);

	/**
	 * MANUALE a ogni partecipante, mai accorpata.
	 * @return numero di partecipanti notificati ({ inviate } di InviaNotificaManuale)
	 */
	int notificaManuale(Evento evento, String testo);

	/**
	 * ANNULLAMENTO a ogni partecipante, con motivoAnnullamento dell'evento se c'e'.
	 * Da chiamare dopo aver impostato stato e motivo.
	 */
	void notificaAnnullamento(Evento evento);

	/** MODERAZIONE al proprietario: una foto del suo evento e' stata rimossa. */
	void notificaFotoRimossa(Evento evento);

	/**
	 * MODERAZIONE al proprietario: evento annullato da un admin, con motivoAnnullamento.
	 * Ai partecipanti va in piu' notificaAnnullamento.
	 */
	void notificaAnnullataDaModerazione(Evento evento);

	/** RICHIESTA al ricevente. Non va chiamato per una richiesta mascherata (sezione 8). */
	void notificaRichiestaAmicizia(Amicizia amicizia);

	/** ACCETTATA al richiedente. */
	void notificaAmiciziaAccettata(Amicizia amicizia);
}
