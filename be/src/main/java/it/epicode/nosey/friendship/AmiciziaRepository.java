package it.epicode.nosey.friendship;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AmiciziaRepository extends JpaRepository<Amicizia, UUID> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select a from Amicizia a where a.id = :id")
	Optional<Amicizia> findConLockById(UUID id);

	// La riga della coppia, in uno qualsiasi dei due versi: al massimo una (uq_amicizia_coppia).
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("""
			select a from Amicizia a
			where (a.richiedente.id = :utenteA and a.ricevente.id = :utenteB)
			   or (a.richiedente.id = :utenteB and a.ricevente.id = :utenteA)""")
	Optional<Amicizia> findConLockByCoppia(UUID utenteA, UUID utenteB);

	// Gli stati si passano come parametri: un letterale enum nel JPQL diventa un cast al tipo
	// "statoamicizia", che su Postgres non esiste (il tipo e' stato_amicizia).

	// ListaAmici (sezione 8): i due utenti si caricano insieme; l'ordine per nome si fa nel service.
	default List<Amicizia> trovaAmici(UUID utenteId) {
		return trovaPerUtenteEStato(utenteId, StatoAmicizia.ACCETTATA);
	}

	// ListaRichiesteRicevute (sezione 8): le PENDENTE in cui l'utente e' il ricevente.
	default List<Amicizia> trovaRicevute(UUID utenteId) {
		return trovaPerRiceventeEStato(utenteId, StatoAmicizia.PENDENTE);
	}

	// ListaRichiesteInviate (sezione 8): le PENDENTE in cui l'utente e' il richiedente, piu' le
	// RIFIUTATA mascherate in cui e' il richiedente respinto (D7).
	default List<Amicizia> trovaInviate(UUID utenteId) {
		return trovaInviate(utenteId, StatoAmicizia.PENDENTE, StatoAmicizia.RIFIUTATA);
	}

	@Query("""
			select a from Amicizia a join fetch a.richiedente join fetch a.ricevente
			where a.stato = :stato and (a.richiedente.id = :utenteId or a.ricevente.id = :utenteId)""")
	List<Amicizia> trovaPerUtenteEStato(UUID utenteId, StatoAmicizia stato);

	@Query("""
			select a from Amicizia a join fetch a.richiedente
			where a.ricevente.id = :riceventeId and a.stato = :stato
			order by a.aggiornataIl desc""")
	List<Amicizia> trovaPerRiceventeEStato(UUID riceventeId, StatoAmicizia stato);

	@Query("""
			select a from Amicizia a join fetch a.ricevente
			where a.richiedente.id = :richiedenteId
			  and (a.stato = :pendente or (a.stato = :rifiutata and a.richiestaMascherata = true))
			order by a.aggiornataIl desc""")
	List<Amicizia> trovaInviate(UUID richiedenteId, StatoAmicizia pendente, StatoAmicizia rifiutata);

	// statoAmicizia (sezione 8): le righe fra un utente e un gruppo di altri, con la chat della
	// coppia, in una sola query.
	@Query("""
			select new it.epicode.nosey.friendship.AmiciziaConChat(a, c.id)
			from Amicizia a left join Chat c on c.amicizia = a
			where (a.richiedente.id = :utenteId and a.ricevente.id in :altriId)
			   or (a.ricevente.id = :utenteId and a.richiedente.id in :altriId)""")
	List<AmiciziaConChat> trovaFraUtenteEAltri(UUID utenteId, Collection<UUID> altriId);
}
