package it.epicode.nosey.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
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

	// ListaNotificheChat (sezione 10): solo le chat con messaggi non letti, dalla piu' recente,
	// con i due utenti della coppia gia' caricati (servono al testo).
	@Query("""
			select n from NotificaChat n
			join fetch n.chat c join fetch c.amicizia a join fetch a.richiedente join fetch a.ricevente
			where n.destinatario.id = :destinatarioId and n.letta = false
			order by n.aggiornataIl desc, n.id desc""")
	List<NotificaChat> trovaNonLette(UUID destinatarioId);

	// ContaNonLette: chats = numero di chat con messaggi non letti (al massimo una notifica per chat).
	long countByDestinatarioIdAndLettaFalse(UUID destinatarioId);

	// SegnaNotificaLetta: una notifica di un altro utente e' 404 come una inesistente.
	Optional<NotificaChat> findByIdAndDestinatarioId(UUID id, UUID destinatarioId);

	// SegnaTutteLette per chats, insieme a MessaggioRepository.segnaTuttiLettiDellAltro.
	@Modifying(flushAutomatically = true)
	@Query("update NotificaChat n set n.letta = true where n.destinatario.id = :destinatarioId and n.letta = false")
	int segnaTutteLette(UUID destinatarioId);

	// Anonimizzazione (sezione 2): le notifiche ricevute si cancellano.
	@Modifying(flushAutomatically = true)
	@Query("delete from NotificaChat n where n.destinatario.id = :destinatarioId")
	int cancellaPerDestinatario(UUID destinatarioId);
}
