package it.epicode.nosey.user;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;

public interface UtenteRepository extends JpaRepository<Utente, UUID> {

	// L'email arriva gia' normalizzata dal DTO.
	Optional<Utente> findByEmail(String email);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	Optional<Utente> findConLockById(UUID id);
}
