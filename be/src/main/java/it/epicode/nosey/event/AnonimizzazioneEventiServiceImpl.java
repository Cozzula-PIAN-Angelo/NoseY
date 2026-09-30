package it.epicode.nosey.event;

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

	@Override
	@Transactional
	public void annullaEventiProprietario(UUID utenteId) {
		List<Evento> eventi = eventoRepository.findByProprietarioIdAndStato(utenteId, StatoEventoDb.PROGRAMMATO);
		eventi.forEach(evento -> evento.setStato(StatoEventoDb.ANNULLATO));
		eventoRepository.saveAll(eventi);
		// TODO NotificheService non esiste ancora (TEAM-02): quando c'e', notificare
		// NOTIFICA_EVENTO ANNULLAMENTO ai partecipanti di ciascun evento qui sopra.
	}

	@Override
	@Transactional
	public void cancellaIscrizioniFuture(UUID utenteId) {
		partecipanteRepository.cancellaPerUtenteEStatoEvento(utenteId, StatoEventoDb.PROGRAMMATO);
	}
}
