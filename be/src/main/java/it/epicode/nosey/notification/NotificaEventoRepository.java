package it.epicode.nosey.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificaEventoRepository extends JpaRepository<NotificaEvento, UUID> {

	// Accorpamento (sezione 10): le notifiche non lette di un tipo per un evento, di tutti i destinatari,
	// in una sola query invece di una per partecipante.
	List<NotificaEvento> findByEventoIdAndTipoAndLettaFalse(UUID eventoId, TipoNotificaEvento tipo);

	// ListaNotificheEventi: dalla piu' recente; l'id a parita' di istante tiene stabili le pagine.
	Page<NotificaEvento> findByDestinatarioIdOrderByCreataIlDescIdDesc(UUID destinatarioId, Pageable pageable);

	long countByDestinatarioIdAndLettaFalse(UUID destinatarioId);

	// SegnaNotificaLetta: una notifica di un altro utente e' 404 come una inesistente.
	Optional<NotificaEvento> findByIdAndDestinatarioId(UUID id, UUID destinatarioId);

	// SegnaTutteLette.
	@Modifying(flushAutomatically = true)
	@Query("update NotificaEvento n set n.letta = true where n.destinatario.id = :destinatarioId and n.letta = false")
	int segnaTutteLette(UUID destinatarioId);

	// Anonimizzazione (sezione 2): le notifiche ricevute si cancellano.
	@Modifying(flushAutomatically = true)
	@Query("delete from NotificaEvento n where n.destinatario.id = :destinatarioId")
	int cancellaPerDestinatario(UUID destinatarioId);
}
