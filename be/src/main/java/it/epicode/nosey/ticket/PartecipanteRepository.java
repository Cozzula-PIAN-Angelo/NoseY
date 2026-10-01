package it.epicode.nosey.ticket;

import it.epicode.nosey.event.StatoEventoDb;
import it.epicode.nosey.user.Utente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface PartecipanteRepository extends JpaRepository<Partecipante, UUID> {

	@Modifying(flushAutomatically = true)
	@Query("delete from Partecipante p where p.utente.id = :utenteId and p.evento.stato = :statoEvento")
	void cancellaPerUtenteEStatoEvento(UUID utenteId, StatoEventoDb statoEvento);

	long countByEventoId(UUID eventoId);

	// Destinatari delle notifiche ai partecipanti (NotificheService).
	@Query("select p.utente from Partecipante p where p.evento.id = :eventoId")
	List<Utente> trovaUtentiPerEvento(UUID eventoId);

	boolean existsByEventoIdAndUtenteId(UUID eventoId, UUID utenteId);
}
