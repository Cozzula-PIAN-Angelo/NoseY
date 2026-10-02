package it.epicode.nosey.ticket;

import it.epicode.nosey.event.StatoEventoDb;
import it.epicode.nosey.user.Utente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PartecipanteRepository extends JpaRepository<Partecipante, UUID> {

	// Anonimizzazione (sezione 2): solo i ticket di eventi davvero futuri, PROGRAMMATO anche dalle date.
	@Modifying(flushAutomatically = true)
	@Query("delete from Partecipante p where p.utente.id = :utenteId and p.evento.stato = :statoEvento"
			+ " and p.evento.dataEvento > :adesso")
	void cancellaPerUtenteEventiFuturi(UUID utenteId, StatoEventoDb statoEvento, Instant adesso);

	long countByEventoId(UUID eventoId);

	// Destinatari delle notifiche ai partecipanti (NotificheService).
	@Query("select p.utente from Partecipante p where p.evento.id = :eventoId")
	List<Utente> trovaUtentiPerEvento(UUID eventoId);

	// ListaPartecipanti (sezione 7): i partecipanti per emesso_il.
	@Query("select p.utente from Partecipante p where p.evento.id = :eventoId order by p.emessoIl")
	List<Utente> trovaUtentiPerEventoInOrdine(UUID eventoId);

	boolean existsByEventoIdAndUtenteId(UUID eventoId, UUID utenteId);

	// VediMiaPartecipazione, CancellaPartecipazione (sezione 7).
	Optional<Partecipante> findByEventoIdAndUtenteId(UUID eventoId, UUID utenteId);

	// MieiTicket (sezione 2): l'ordinamento (programmati/in corso prima, poi conclusi/annullati)
	// dipende dallo stato calcolato dalle date, quindi si fa in Java dopo aver letto tutto.
	List<Partecipante> findByUtenteId(UUID utenteId);
}
