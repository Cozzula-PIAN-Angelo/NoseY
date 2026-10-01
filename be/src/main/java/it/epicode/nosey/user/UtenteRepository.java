package it.epicode.nosey.user;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface UtenteRepository extends JpaRepository<Utente, UUID> {

	Optional<Utente> findByEmail(String email);

	boolean existsByIdAndStato(UUID id, StatoUtente stato);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select u from Utente u where u.id = :id")
	Optional<Utente> findConLockById(UUID id);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select u from Utente u where u.email = :email")
	Optional<Utente> findConLockByEmail(String email);

	/**
	 * Consuma un tentativo sul codice PRIMA del confronto, in modo atomico (sezione 1):
	 * con un contatore letto e poi salvato, richieste in parallelo supererebbero il massimo.
	 * 0 righe aggiornate = tentativi esauriti.
	 */
	@Modifying(flushAutomatically = true)
	@Query("update Utente u set u.codiceTentativi = u.codiceTentativi + 1 where u.id = :id and u.codiceTentativi < :massimo")
	int consumaTentativoCodice(UUID id, int massimo);
}
