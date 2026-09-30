package it.epicode.nosey.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificaChatRepository extends JpaRepository<NotificaChat, UUID> {
}
