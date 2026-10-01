package it.epicode.nosey.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ArtistaEventoRepository extends JpaRepository<ArtistaEvento, ArtistaEventoId> {

	// Artisti dell'evento, in ordine alfabetico (progettazione v4, sezione 3 "VediEvento").
	@Query("select ae.artista from ArtistaEvento ae where ae.evento.id = :eventoId order by lower(ae.artista.nome)")
	List<Artista> findArtistiOrdinatiByEventoId(UUID eventoId);

	// AggiungiArtistaEvento, RimuoviArtistaEvento (sezione 6).
	boolean existsByEventoIdAndArtistaId(UUID eventoId, UUID artistaId);
}
