package it.epicode.nosey.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificaAmiciziaRepository extends JpaRepository<NotificaAmicizia, UUID> {

	// AccettaAmicizia e RifiutaAmicizia: le RICHIESTA non lette diventano lette (sezione 8).
	List<NotificaAmicizia> findByAmiciziaIdAndTipoAndLettaFalse(UUID amiciziaId, TipoNotificaAmicizia tipo);

	// RitiraRichiesta: si cancellano le RICHIESTA ricevute dall'altro (sezione 8).
	void deleteByAmiciziaIdAndDestinatarioIdAndTipo(UUID amiciziaId, UUID destinatarioId,
			TipoNotificaAmicizia tipo);

	// ListaNotificheAmicizie: dalla piu' recente, con i due utenti della coppia gia' caricati
	// (servono al testo) invece di una query per notifica.
	@EntityGraph(attributePaths = {"amicizia.richiedente", "amicizia.ricevente"})
	Page<NotificaAmicizia> findByDestinatarioIdOrderByCreataIlDescIdDesc(UUID destinatarioId, Pageable pageable);

	long countByDestinatarioIdAndLettaFalse(UUID destinatarioId);

	// SegnaNotificaLetta: una notifica di un altro utente e' 404 come una inesistente.
	Optional<NotificaAmicizia> findByIdAndDestinatarioId(UUID id, UUID destinatarioId);

	// SegnaTutteLette.
	@Modifying(flushAutomatically = true)
	@Query("update NotificaAmicizia n set n.letta = true where n.destinatario.id = :destinatarioId and n.letta = false")
	int segnaTutteLette(UUID destinatarioId);

	// Anonimizzazione (sezione 2): le notifiche ricevute si cancellano.
	@Modifying(flushAutomatically = true)
	@Query("delete from NotificaAmicizia n where n.destinatario.id = :destinatarioId")
	int cancellaPerDestinatario(UUID destinatarioId);
}
