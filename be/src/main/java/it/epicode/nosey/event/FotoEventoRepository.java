package it.epicode.nosey.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FotoEventoRepository extends JpaRepository<FotoEvento, UUID> {

	// Prima la copertina, poi per caricata_il crescente (progettazione v4, sezione 4).
	List<FotoEvento> findByEventoIdOrderByCopertinaDescCaricataIlAsc(UUID eventoId);
}
