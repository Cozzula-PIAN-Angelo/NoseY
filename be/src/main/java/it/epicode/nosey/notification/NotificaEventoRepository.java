package it.epicode.nosey.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificaEventoRepository extends JpaRepository<NotificaEvento, UUID> {

	// Accorpamento (sezione 10): le notifiche non lette di un tipo per un evento, di tutti i destinatari,
	// in una sola query invece di una per partecipante.
	List<NotificaEvento> findByEventoIdAndTipoAndLettaFalse(UUID eventoId, TipoNotificaEvento tipo);
}
