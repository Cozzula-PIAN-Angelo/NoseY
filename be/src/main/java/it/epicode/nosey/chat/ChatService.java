package it.epicode.nosey.chat;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.friendship.StatoAmicizia;
import it.epicode.nosey.notification.NotificaChatRepository;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtentePubblicoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * ListaChat, ListaMessaggi e SegnaChatLetta (progettazione v4, sezione 9).
 * InviaMessaggio passa dal WebSocket (sezione 11).
 */
@Service
@RequiredArgsConstructor
public class ChatService {

	private final ChatRepository chatRepository;
	private final MessaggioRepository messaggioRepository;
	private final NotificaChatRepository notificaChatRepository;

	@Transactional(readOnly = true)
	public List<ChatResponse> lista(UUID utenteId) {
		List<Chat> chat = chatRepository.trovaPerMembro(utenteId);
		if (chat.isEmpty()) {
			return List.of();
		}
		// Ultimo messaggio e non letti: una query ciascuno per tutta la lista.
		List<UUID> chatIds = chat.stream().map(Chat::getId).toList();
		Map<UUID, Messaggio> ultimi = messaggioRepository.trovaUltimiPerChat(chatIds).stream()
				.collect(Collectors.toMap(m -> m.getChat().getId(), Function.identity()));
		Map<UUID, Long> nonLetti = messaggioRepository.contaNonLetti(chatIds, utenteId).stream()
				.collect(Collectors.toMap(NonLettiPerChat::chatId, NonLettiPerChat::numero));

		// Per ultima attivita', dalla piu' recente: l'ultimo messaggio, o creata_il se non ce ne sono
		// (decisione 16). L'id a parita' di istante tiene l'ordine stabile fra una chiamata e l'altra.
		Comparator<Chat> perUltimaAttivita = Comparator
				.comparing((Chat c) -> ultimaAttivita(c, ultimi.get(c.getId())))
				.thenComparing(Chat::getId)
				.reversed();
		return chat.stream()
				.sorted(perUltimaAttivita)
				.map(c -> risposta(c, utenteId, ultimi.get(c.getId()), nonLetti.getOrDefault(c.getId(), 0L)))
				.toList();
	}

	// Anche in sola lettura: basta essere uno dei due utenti della coppia.
	@Transactional(readOnly = true)
	public MessaggiResponse messaggi(UUID chatId, UUID beforeId, int size, UUID utenteId) {
		caricaDaMembro(chatId, utenteId);
		if (beforeId != null && !messaggioRepository.existsByIdAndChatId(beforeId, chatId)) {
			throw new ApplicazioneException(CodiceErrore.NON_TROVATO, "Messaggio non trovato in questa chat");
		}

		// Uno in piu' del richiesto: se arriva, ci sono altri messaggi piu' vecchi.
		Limit limite = Limit.of(size + 1);
		List<Messaggio> trovati = beforeId == null
				? messaggioRepository.trovaPiuRecenti(chatId, limite)
				: messaggioRepository.trovaPrimaDi(chatId, beforeId, limite);
		boolean altri = trovati.size() > size;
		List<MessaggioResponse> messaggi = trovati.stream()
				.limit(size)
				.map(MessaggioResponse::da)
				.toList();
		return new MessaggiResponse(messaggi, altri);
	}

	/**
	 * letto = true sui messaggi dell'altro e NOTIFICA_CHAT dell'utente per questa chat letta.
	 * Lo stesso effetto serve a SegnaNotificaLetta e SegnaTutteLette per la categoria chats (sezione 10).
	 */
	@Transactional
	public void segnaLetta(UUID chatId, UUID utenteId) {
		caricaDaMembro(chatId, utenteId);
		messaggioRepository.segnaLettiDellAltro(chatId, utenteId);
		notificaChatRepository.segnaLetta(chatId, utenteId);
	}

	// 404 se la chat non esiste, 403 NON_MEMBRO se esiste ma non e' della coppia (sezione 9).
	private Chat caricaDaMembro(UUID chatId, UUID utenteId) {
		Chat chat = chatRepository.findById(chatId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Chat non trovata"));
		Amicizia amicizia = chat.getAmicizia();
		if (!amicizia.getRichiedente().getId().equals(utenteId) && !amicizia.getRicevente().getId().equals(utenteId)) {
			throw new ApplicazioneException(CodiceErrore.NON_MEMBRO, "Non fai parte di questa chat");
		}
		return chat;
	}

	private ChatResponse risposta(Chat chat, UUID utenteId, Messaggio ultimo, long nonLetti) {
		Amicizia amicizia = chat.getAmicizia();
		boolean sonoRichiedente = amicizia.getRichiedente().getId().equals(utenteId);
		Utente io = sonoRichiedente ? amicizia.getRichiedente() : amicizia.getRicevente();
		Utente amico = sonoRichiedente ? amicizia.getRicevente() : amicizia.getRichiedente();
		boolean puoiScrivere = amicizia.getStato() == StatoAmicizia.ACCETTATA
				&& io.getStato() == StatoUtente.ATTIVO
				&& amico.getStato() == StatoUtente.ATTIVO;
		return new ChatResponse(
				chat.getId(),
				UtentePubblicoResponse.da(amico),
				ultimo == null ? null : ChatResponse.UltimoMessaggio.da(ultimo),
				nonLetti,
				puoiScrivere);
	}

	private Instant ultimaAttivita(Chat chat, Messaggio ultimo) {
		return ultimo == null ? chat.getCreataIl() : ultimo.getInviatoIl();
	}
}
