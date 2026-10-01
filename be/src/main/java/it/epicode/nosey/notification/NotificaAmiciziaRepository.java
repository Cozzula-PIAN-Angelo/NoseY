package it.epicode.nosey.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificaAmiciziaRepository extends JpaRepository<NotificaAmicizia, UUID> {

	// AccettaAmicizia e RifiutaAmicizia: le RICHIESTA non lette diventano lette (sezione 8).
	List<NotificaAmicizia> findByAmiciziaIdAndTipoAndLettaFalse(UUID amiciziaId, TipoNotificaAmicizia tipo);

	// RitiraRichiesta: si cancellano le RICHIESTA ricevute dall'altro (sezione 8).
	void deleteByAmiciziaIdAndDestinatarioIdAndTipo(UUID amiciziaId, UUID destinatarioId,
			TipoNotificaAmicizia tipo);
}
