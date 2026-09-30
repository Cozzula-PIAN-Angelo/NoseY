package it.epicode.nosey.user;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RuoloRepository extends JpaRepository<Ruolo, UUID> {

	Optional<Ruolo> findByNome(String nome);
}
