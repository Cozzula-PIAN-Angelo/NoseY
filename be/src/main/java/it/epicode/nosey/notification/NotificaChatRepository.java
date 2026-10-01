package it.epicode.nosey.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.UUID;

public interface NotificaChatRepository extends JpaRepository<NotificaChat, UUID> {

	// SegnaChatLetta (sezione 9): la NOTIFICA_CHAT dell'utente per questa chat diventa letta.
	@Modifying(flushAutomatically = true)
	@Query("update NotificaChat n set n.letta = true where n.chat.id = :chatId and n.destinatario.id = :destinatarioId")
	int segnaLetta(UUID chatId, UUID destinatarioId);

	/**
	 * InviaMessaggio (sezioni 10 e 11): la NOTIFICA_CHAT del destinatario torna non letta, creandola
	 * se manca. Un solo statement atomico: due messaggi in contemporanea non violano uq_notifica_chat.
	 */
	@Modifying(flushAutomatically = true)
	@Query(value = """
			insert into notifica_chat (id, destinatario_id, chat_id, letta, aggiornata_il)
			values (gen_random_uuid(), :destinatarioId, :chatId, false, :adesso)
			on conflict (destinatario_id, chat_id) do update set letta = false, aggiornata_il = excluded.aggiornata_il""",
			nativeQuery = true)
	int segnaNonLetta(UUID chatId, UUID destinatarioId, Instant adesso);
}
