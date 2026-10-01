package it.epicode.nosey.friendship;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

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
}
