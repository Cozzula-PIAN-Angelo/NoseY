package it.epicode.nosey.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.UUID;

public interface TokenJwtRepository extends JpaRepository<TokenJwt, UUID> {

	boolean existsByJtiAndRevocatoFalse(UUID jti);

	@Modifying(flushAutomatically = true)
	@Query("update TokenJwt t set t.revocato = true where t.jti = :jti")
	int revocaPerJti(UUID jti);

	@Modifying(flushAutomatically = true)
	@Query("update TokenJwt t set t.revocato = true where t.utente.id = :utenteId and t.revocato = false")
	int revocaTuttiPerUtente(UUID utenteId);

	@Modifying(flushAutomatically = true)
	@Query("update TokenJwt t set t.revocato = true where t.utente.id = :utenteId and t.jti <> :jti and t.revocato = false")
	int revocaAltriPerUtente(UUID utenteId, UUID jti);

	@Modifying(flushAutomatically = true)
	@Query("delete from TokenJwt t where t.scadenza < :adesso")
	int cancellaScaduti(Instant adesso);
}
