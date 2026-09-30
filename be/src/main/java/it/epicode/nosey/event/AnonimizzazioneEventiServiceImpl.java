package it.epicode.nosey.event;

import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.ticket.PartecipanteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnonimizzazioneEventiServiceImpl implements AnonimizzazioneEventiService {

	private final EventoRepository eventoRepository;
	private final PartecipanteRepository partecipanteRepository;
	private final NotificheService notificheService;

	@Override
	@Transactional
	public void annullaEventiProprietario(UUID utenteId) {
		List<Evento> eventi = eventoRepository.findByProprietarioIdAndStato(utenteId, StatoEventoDb.PROGRAMMATO);
		eventi.forEach(evento -> evento.setStato(StatoEventoDb.ANNULLATO));
		eventoRepository.saveAll(eventi);
		eventi.forEach(notificheService::notificaAnnullamento);
	}

	@Override
	@Transactional
	public void cancellaIscrizioniFuture(UUID utenteId) {
		partecipanteRepository.cancellaPerUtenteEStatoEvento(utenteId, StatoEventoDb.PROGRAMMATO);
	}
}
