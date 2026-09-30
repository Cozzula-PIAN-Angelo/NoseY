package it.epicode.nosey.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MessaggioRepository extends JpaRepository<Messaggio, UUID> {
}
