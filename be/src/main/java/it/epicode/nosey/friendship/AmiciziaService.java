package it.epicode.nosey.friendship;

import it.epicode.nosey.chat.ChatRepository;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.Limite;
import it.epicode.nosey.common.LimitiService;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.ticket.PartecipanteRepository;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/**
 * RichiediAmicizia (progettazione v4, sezione 8).
 */
@Service
@RequiredArgsConstructor
public class AmiciziaService {

	private final AmiciziaRepository amiciziaRepository;
	private final ChatRepository chatRepository;
	private final UtenteRepository utenteRepository;
	private final EventoRepository eventoRepository;
	private final PartecipanteRepository partecipanteRepository;
	private final NotificheService notificheService;
	private final LimitiService limitiService;
	private final Clock clock;

	@Transactional
	public AmiciziaResponse richiedi(RichiediAmiciziaRequest richiesta, UUID utenteId) {
		// Il tentativo conta anche se la richiesta poi fallisce (docs/interfacce.md).
		limitiService.consuma(Limite.RICHIESTE_AMICIZIA, utenteId.toString());

		UUID riceventeId = richiesta.riceventeId();
		if (riceventeId.equals(utenteId)) {
			throw new ApplicazioneException(CodiceErrore.RICHIESTA_A_SE_STESSO,
					"Non puoi chiedere l'amicizia a te stesso");
		}
		Utente ricevente = utenteRepository.findById(riceventeId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Utente non trovato"));
		Evento evento = eventoRepository.findById(richiesta.eventoId())
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));

		if (!haTicketOProprietario(evento, utenteId) || !haTicketOProprietario(evento, riceventeId)) {
			throw new ApplicazioneException(CodiceErrore.NESSUN_TICKET,
					"Tu e l'altro utente dovete avere un ticket per questo evento");
		}
		if (ricevente.getStato() != StatoUtente.ATTIVO) {
			throw new ApplicazioneException(CodiceErrore.UTENTE_NON_ATTIVO, "L'utente non e' piu' attivo");
		}

		Instant adesso = clock.instant();
		Amicizia amicizia = amiciziaRepository.findConLockByCoppia(utenteId, riceventeId).orElse(null);
		if (amicizia == null) {
			amicizia = new Amicizia();
			amicizia.setCreataIl(adesso);
			apri(amicizia, utenteId, ricevente, evento, adesso);
			// Due richieste incrociate nello stesso istante: la seconda viola uq_amicizia_coppia.
			// Con il flush qui l'errore arriva subito al GestoreErrori come 409 CONFLITTO.
			amiciziaRepository.saveAndFlush(amicizia);
			notificheService.notificaRichiestaAmicizia(amicizia);
			return risposta(amicizia, ricevente);
		}

		boolean chiusaDaMe = amicizia.getChiusaDa() != null && amicizia.getChiusaDa().getId().equals(utenteId);
		switch (amicizia.getStato()) {
			case PENDENTE -> {
				if (amicizia.getRichiedente().getId().equals(utenteId)) {
					throw new ApplicazioneException(CodiceErrore.RICHIESTA_GIA_INVIATA,
							"Hai gia' inviato una richiesta a questo utente");
				}
				throw new ApplicazioneException(CodiceErrore.RICHIESTA_GIA_RICEVUTA,
						"Questo utente ti ha gia' chiesto l'amicizia");
			}
			case ACCETTATA -> throw new ApplicazioneException(CodiceErrore.GIA_AMICI, "Siete gia' amici");
			case RIMOSSA -> {
				if (!chiusaDaMe) {
					throw new ApplicazioneException(CodiceErrore.AMICIZIA_NON_DISPONIBILE,
							"L'amicizia non e' disponibile");
				}
				riapri(amicizia, utenteId, ricevente, evento, adesso);
			}
			case RIFIUTATA -> {
				if (chiusaDaMe) {
					riapri(amicizia, utenteId, ricevente, evento, adesso);
				} else if (amicizia.isRichiestaMascherata()) {
					throw new ApplicazioneException(CodiceErrore.RICHIESTA_GIA_INVIATA,
							"Hai gia' inviato una richiesta a questo utente");
				} else {
					// Rifiuto silenzioso (D7): per chi chiede la richiesta riparte, nessuna notifica.
					// Si aggiornano anche evento e data, come in una richiesta vera (decisione 13).
					amicizia.setRichiestaMascherata(true);
					amicizia.setEvento(evento);
					amicizia.setAggiornataIl(adesso);
				}
			}
			case RITIRATA -> riapri(amicizia, utenteId, ricevente, evento, adesso);
		}
		return risposta(amicizia, ricevente);
	}

	// Il proprietario dell'evento conta come se avesse il ticket (D6).
	private boolean haTicketOProprietario(Evento evento, UUID utenteId) {
		return evento.getProprietario().getId().equals(utenteId)
				|| partecipanteRepository.existsByEventoIdAndUtenteId(evento.getId(), utenteId);
	}

	// Riga riusata: PENDENTE da chi chiede, con richiedente, ricevente ed evento aggiornati (sezione 8).
	private void riapri(Amicizia amicizia, UUID utenteId, Utente ricevente, Evento evento, Instant adesso) {
		apri(amicizia, utenteId, ricevente, evento, adesso);
		notificheService.notificaRichiestaAmicizia(amicizia);
	}

	private void apri(Amicizia amicizia, UUID utenteId, Utente ricevente, Evento evento, Instant adesso) {
		amicizia.setRichiedente(utenteRepository.getReferenceById(utenteId));
		amicizia.setRicevente(ricevente);
		amicizia.setEvento(evento);
		amicizia.setStato(StatoAmicizia.PENDENTE);
		amicizia.setChiusaDa(null);
		amicizia.setRichiestaMascherata(false);
		amicizia.setAggiornataIl(adesso);
	}

	private AmiciziaResponse risposta(Amicizia amicizia, Utente ricevente) {
		UUID chatId = chatRepository.trovaIdPerAmicizia(amicizia.getId()).orElse(null);
		return AmiciziaResponse.da(amicizia, ricevente, StatoAmiciziaVista.INVIATA, chatId);
	}
}
