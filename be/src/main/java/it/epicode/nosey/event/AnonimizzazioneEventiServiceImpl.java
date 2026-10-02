package it.epicode.nosey.event;

import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.ticket.PartecipanteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnonimizzazioneEventiServiceImpl implements AnonimizzazioneEventiService {

	private final EventoRepository eventoRepository;
	private final PartecipanteRepository partecipanteRepository;
	private final NotificheService notificheService;
	private final Clock clock;

	// Nel DB anche gli eventi in corso e conclusi hanno stato PROGRAMMATO (StatoEvento.calcola):
	// per toccare solo quelli futuri serve anche dataEvento > adesso.

	@Override
	@Transactional
	public void annullaEventiProprietario(UUID utenteId) {
		List<Evento> eventi = eventoRepository.findByProprietarioIdAndStatoAndDataEventoAfter(
				utenteId, StatoEventoDb.PROGRAMMATO, clock.instant());
		eventi.forEach(evento -> evento.setStato(StatoEventoDb.ANNULLATO));
		eventoRepository.saveAll(eventi);
		eventi.forEach(notificheService::notificaAnnullamento);
	}

	@Override
	@Transactional
	public void cancellaIscrizioniFuture(UUID utenteId) {
		partecipanteRepository.cancellaPerUtenteEventiFuturi(utenteId, StatoEventoDb.PROGRAMMATO, clock.instant());
	}
}
