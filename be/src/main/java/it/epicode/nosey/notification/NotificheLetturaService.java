package it.epicode.nosey.notification;

import it.epicode.nosey.chat.ChatService;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.PaginaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Liste, conteggi e lettura delle notifiche di chi fa la richiesta (progettazione v4, sezione 10).
 * La creazione resta in NotificheService, il contratto TEAM-02 usato anche dal lato eventi.
 */
@Service
@RequiredArgsConstructor
public class NotificheLetturaService {

	private final NotificaEventoRepository notificaEventoRepository;
	private final NotificaAmiciziaRepository notificaAmiciziaRepository;
	private final NotificaChatRepository notificaChatRepository;
	private final ChatService chatService;

	@Transactional(readOnly = true)
	public PaginaResponse<NotificaResponse> listaEventi(UUID utenteId, int page, int size) {
		return PaginaResponse.di(notificaEventoRepository
				.findByDestinatarioIdOrderByCreataIlDescIdDesc(utenteId, PageRequest.of(page, size))
				.map(NotificaResponse::da));
	}

	@Transactional(readOnly = true)
	public PaginaResponse<NotificaResponse> listaAmicizie(UUID utenteId, int page, int size) {
		return PaginaResponse.di(notificaAmiciziaRepository
				.findByDestinatarioIdOrderByCreataIlDescIdDesc(utenteId, PageRequest.of(page, size))
				.map(NotificaResponse::da));
	}

	@Transactional(readOnly = true)
	public List<NotificaResponse> listaChat(UUID utenteId) {
		return notificaChatRepository.trovaNonLette(utenteId).stream()
				.map(NotificaResponse::da)
				.toList();
	}

	// Chiavi nell'ordine dell'enum: { "events": 3, "friendships": 1, "chats": 2 }.
	@Transactional(readOnly = true)
	public Map<String, Long> contaNonLette(UUID utenteId) {
		Map<String, Long> conteggi = new LinkedHashMap<>();
		conteggi.put(CategoriaNotifica.EVENTS.valore(), notificaEventoRepository.countByDestinatarioIdAndLettaFalse(utenteId));
		conteggi.put(CategoriaNotifica.FRIENDSHIPS.valore(), notificaAmiciziaRepository.countByDestinatarioIdAndLettaFalse(utenteId));
		conteggi.put(CategoriaNotifica.CHATS.valore(), notificaChatRepository.countByDestinatarioIdAndLettaFalse(utenteId));
		return conteggi;
	}

	/** Per chats fa quello che fa SegnaChatLetta sulla chat collegata: anche i messaggi diventano letti. */
	@Transactional
	public void segnaLetta(String categoria, UUID notificaId, UUID utenteId) {
		switch (CategoriaNotifica.da(categoria)) {
			case EVENTS -> notificaEventoRepository.findByIdAndDestinatarioId(notificaId, utenteId)
					.orElseThrow(NotificheLetturaService::nonTrovata)
					.setLetta(true);
			case FRIENDSHIPS -> notificaAmiciziaRepository.findByIdAndDestinatarioId(notificaId, utenteId)
					.orElseThrow(NotificheLetturaService::nonTrovata)
					.setLetta(true);
			case CHATS -> {
				NotificaChat notifica = notificaChatRepository.findByIdAndDestinatarioId(notificaId, utenteId)
						.orElseThrow(NotificheLetturaService::nonTrovata);
				chatService.segnaLetta(notifica.getChat().getId(), utenteId);
			}
		}
	}

	/** Senza categoria, tutte e tre. Per chats segna letti anche i messaggi. */
	@Transactional
	public void segnaTutteLette(String categoria, UUID utenteId) {
		CategoriaNotifica scelta = categoria == null ? null : CategoriaNotifica.da(categoria);
		if (scelta == null || scelta == CategoriaNotifica.EVENTS) {
			notificaEventoRepository.segnaTutteLette(utenteId);
		}
		if (scelta == null || scelta == CategoriaNotifica.FRIENDSHIPS) {
			notificaAmiciziaRepository.segnaTutteLette(utenteId);
		}
		if (scelta == null || scelta == CategoriaNotifica.CHATS) {
			chatService.segnaTutteLette(utenteId);
		}
	}

	private static ApplicazioneException nonTrovata() {
		return new ApplicazioneException(CodiceErrore.NON_TROVATO, "Notifica non trovata");
	}
}
