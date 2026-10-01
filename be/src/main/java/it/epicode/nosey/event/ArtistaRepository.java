package it.epicode.nosey.event;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ArtistaRepository extends JpaRepository<Artista, UUID> {

	// ListaArtisti (sezione 6): solo attivi, in ordine alfabetico.
	List<Artista> findByAttivoTrueOrderByNomeAsc();

	// Con ?search=: contiene, senza distinzione di maiuscole/minuscole.
	List<Artista> findByAttivoTrueAndNomeContainingIgnoreCaseOrderByNomeAsc(String search);

	// CreaArtista (sezione 12): nome unico senza distinzione di maiuscole/minuscole.
	boolean existsByNomeIgnoreCase(String nome);

	// ModificaArtista (sezione 12): lock come EventoRepository, per modifiche admin concorrenti.
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select a from Artista a where a.id = :id")
	Optional<Artista> findConLockById(UUID id);
}
