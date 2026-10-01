package it.epicode.nosey.chat;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface MessaggioRepository extends JpaRepository<Messaggio, UUID> {

	// ListaMessaggi (sezione 9), prima pagina: ordine (inviato_il, id) decrescente, come ix_messaggio_chat.
	@Query("select m from Messaggio m where m.chat.id = :chatId order by m.inviatoIl desc, m.id desc")
	List<Messaggio> trovaPiuRecenti(UUID chatId, Limit limit);

	// ListaMessaggi, pagine successive: i messaggi che vengono DOPO il cursore nello stesso ordine.
	// Il cursore si legge dal database nella stessa query: nessun confronto con un Instant in memoria,
	// che puo' avere una precisione diversa da quella di timestamptz.
	@Query("""
			select m from Messaggio m
			where m.chat.id = :chatId
			  and (m.inviatoIl < (select b.inviatoIl from Messaggio b where b.id = :beforeId)
			       or (m.inviatoIl = (select b.inviatoIl from Messaggio b where b.id = :beforeId)
			           and m.id < :beforeId))
			order by m.inviatoIl desc, m.id desc""")
	List<Messaggio> trovaPrimaDi(UUID chatId, UUID beforeId, Limit limit);

	// 404 NON_TROVATO se before non appartiene alla chat (sezione 9).
	boolean existsByIdAndChatId(UUID id, UUID chatId);

	// ListaChat: l'ultimo messaggio di ogni chat della lista, con una sola query.
	@Query(value = """
			select distinct on (chat_id) * from messaggio
			where chat_id in (:chatIds)
			order by chat_id, inviato_il desc, id desc""", nativeQuery = true)
	List<Messaggio> trovaUltimiPerChat(Collection<UUID> chatIds);

	// ListaChat: nonLetti = messaggi dell'altro non ancora letti, per ogni chat della lista.
	@Query("""
			select new it.epicode.nosey.chat.NonLettiPerChat(m.chat.id, count(m))
			from Messaggio m
			where m.chat.id in :chatIds and m.mittente.id <> :utenteId and m.letto = false
			group by m.chat.id""")
	List<NonLettiPerChat> contaNonLetti(Collection<UUID> chatIds, UUID utenteId);

	// SegnaChatLetta: solo i messaggi dell'altro; i propri restano come sono (letti o no dall'altro).
	@Modifying(flushAutomatically = true)
	@Query("""
			update Messaggio m set m.letto = true
			where m.chat.id = :chatId and m.mittente.id <> :utenteId and m.letto = false""")
	int segnaLettiDellAltro(UUID chatId, UUID utenteId);

	// SegnaTutteLette per chats (sezione 10): come segnaLettiDellAltro, in tutte le chat dell'utente.
	@Modifying(flushAutomatically = true)
	@Query("""
			update Messaggio m set m.letto = true
			where m.mittente.id <> :utenteId and m.letto = false
			and m.chat.id in (select c.id from Chat c
					where c.amicizia.richiedente.id = :utenteId or c.amicizia.ricevente.id = :utenteId)""")
	int segnaTuttiLettiDellAltro(UUID utenteId);
}
