package it.epicode.nosey.event;

import java.util.UUID;

/**
 * Contratto TEAM-02 per l'anonimizzazione (progettazione v4, sezione 2):
 * il lato utenti (BE2) chiama questi due metodi, senza dover conoscere
 * come sono fatti Evento o Partecipante.
 */
public interface AnonimizzazioneEventiService {

	/**
	 * Eventi PROGRAMMATO di cui utenteId e' proprietario -> ANNULLATO.
	 * IN_CORSO e CONCLUSO restano invariati.
	 */
	void annullaEventiProprietario(UUID utenteId);

	/**
	 * Iscrizioni (ticket) di utenteId a eventi PROGRAMMATO -> cancellate.
	 * I ticket di eventi in corso, conclusi o annullati restano.
	 */
	void cancellaIscrizioniFuture(UUID utenteId);
}
