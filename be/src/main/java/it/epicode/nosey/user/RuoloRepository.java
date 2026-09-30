package it.epicode.nosey.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RuoloRepository extends JpaRepository<Ruolo, UUID> {

	Optional<Ruolo> findByNome(String nome);
}
