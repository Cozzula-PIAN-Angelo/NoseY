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

	// Anonimizzazione (sezione 2): solo gli eventi davvero futuri, PROGRAMMATO anche dalle date.
	List<Evento> findByProprietarioIdAndStatoAndDataEventoAfter(UUID proprietarioId, StatoEventoDb stato, Instant adesso);

	// MieiEventi (sezione 2): tutti, anche conclusi e annullati, per dataEvento decrescente.
	List<Evento> findByProprietarioIdOrderByDataEventoDesc(UUID proprietarioId);

	// ListaEventiMappa (progettazione v4, sezione 3): solo PROGRAMMATO con data_fine >= adesso
	// (comprende anche gli eventi gia' iniziati, IN_CORSO nel DTO). Ordine base per dataEvento;
	// con lat/lng il service riordina per distanza in Java (Haversine).
	List<Evento> findByStatoAndDataFineGreaterThanEqualOrderByDataEventoAsc(StatoEventoDb stato, Instant adesso);
}
