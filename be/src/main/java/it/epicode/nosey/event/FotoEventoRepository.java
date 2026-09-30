package it.epicode.nosey.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FotoEventoRepository extends JpaRepository<FotoEvento, UUID> {

	// Prima la copertina, poi per caricata_il crescente (progettazione v4, sezione 4).
	List<FotoEvento> findByEventoIdOrderByCopertinaDescCaricataIlAsc(UUID eventoId);

	// Copertine di piu' eventi insieme (ListaEventiMappa): una query sola invece di una per evento.
	// Al massimo una per evento, grazie all'indice unico uq_foto_copertina.
	List<FotoEvento> findByEventoIdInAndCopertinaTrue(Collection<UUID> eventoIds);

	// Per il GET pubblico dell'immagine (decisione 9): la foto deve appartenere a quell'evento.
	Optional<FotoEvento> findByIdAndEventoId(UUID id, UUID eventoId);
}
