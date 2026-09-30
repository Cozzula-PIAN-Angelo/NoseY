package it.epicode.nosey.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FotoEventoRepository extends JpaRepository<FotoEvento, UUID> {
}
