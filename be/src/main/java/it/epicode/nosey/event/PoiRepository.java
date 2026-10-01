package it.epicode.nosey.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PoiRepository extends JpaRepository<Poi, UUID> {

	List<Poi> findByEventoId(UUID eventoId);

	// LIMITE_POI: max 15 per evento (progettazione v4, sezione 5).
	long countByEventoId(UUID eventoId);

	// ModificaPOI, CancellaPOI: il POI deve appartenere a quell'evento.
	Optional<Poi> findByIdAndEventoId(UUID id, UUID eventoId);
}
