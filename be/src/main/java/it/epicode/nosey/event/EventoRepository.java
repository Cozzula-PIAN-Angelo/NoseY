package it.epicode.nosey.event;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventoRepository extends JpaRepository<Evento, UUID> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select e from Evento e where e.id = :id")
	Optional<Evento> findConLockById(UUID id);

	List<Evento> findByProprietarioIdAndStato(UUID proprietarioId, StatoEventoDb stato);
}
