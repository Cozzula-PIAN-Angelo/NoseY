package it.epicode.nosey.event;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventoRepository extends JpaRepository<Evento, UUID> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select e from Evento e where e.id = :id")
	Optional<Evento> findConLockById(UUID id);

	List<Evento> findByProprietarioIdAndStato(UUID proprietarioId, StatoEventoDb stato);

	// ListaEventiMappa (progettazione v4, sezione 3): solo PROGRAMMATO con data_fine >= adesso
	// (comprende anche gli eventi gia' iniziati, IN_CORSO nel DTO). Ordine base per dataEvento;
	// con lat/lng il service riordina per distanza in Java (Haversine).
	List<Evento> findByStatoAndDataFineGreaterThanEqualOrderByDataEventoAsc(StatoEventoDb stato, Instant adesso);
}
