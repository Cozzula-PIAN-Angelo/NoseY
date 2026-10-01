package it.epicode.nosey.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface NotificaChatRepository extends JpaRepository<NotificaChat, UUID> {

	// SegnaChatLetta (sezione 9): la NOTIFICA_CHAT dell'utente per questa chat diventa letta.
	@Modifying(flushAutomatically = true)
	@Query("update NotificaChat n set n.letta = true where n.chat.id = :chatId and n.destinatario.id = :destinatarioId")
	int segnaLetta(UUID chatId, UUID destinatarioId);
}
