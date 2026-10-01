package it.epicode.nosey.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ArtistaRepository extends JpaRepository<Artista, UUID> {

	// ListaArtisti (sezione 6): solo attivi, in ordine alfabetico.
	List<Artista> findByAttivoTrueOrderByNomeAsc();

	// Con ?search=: contiene, senza distinzione di maiuscole/minuscole.
	List<Artista> findByAttivoTrueAndNomeContainingIgnoreCaseOrderByNomeAsc(String search);
}
