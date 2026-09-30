package it.epicode.nosey.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RuoloRepository extends JpaRepository<Ruolo, UUID> {
}
