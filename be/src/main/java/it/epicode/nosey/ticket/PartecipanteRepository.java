package it.epicode.nosey.ticket;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PartecipanteRepository extends JpaRepository<Partecipante, UUID> {
}
