package it.epicode.nosey.ticket;

import it.epicode.nosey.event.StatoEventoDb;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface PartecipanteRepository extends JpaRepository<Partecipante, UUID> {

	@Modifying(flushAutomatically = true)
	@Query("delete from Partecipante p where p.utente.id = :utenteId and p.evento.stato = :statoEvento")
	void cancellaPerUtenteEStatoEvento(UUID utenteId, StatoEventoDb statoEvento);
}
