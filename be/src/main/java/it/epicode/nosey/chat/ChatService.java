package it.epicode.nosey.chat;

import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.Limite;
import it.epicode.nosey.common.LimitiService;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.friendship.StatoAmicizia;
import it.epicode.nosey.notification.NotificaChatRepository;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtentePubblicoResponse;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * ListaChat, ListaMessaggi e SegnaChatLetta (progettazione v4, sezione 9),
 * InviaMessaggio dal WebSocket (sezione 11).
 */
@Service
@RequiredArgsConstructor
public class ChatService {

	private final ChatRepository chatRepository;
	private final MessaggioRepository messaggioRepository;
	private final NotificaChatRepository notificaChatRepository;
	private final TokenService tokenService;
	private final LimitiService limitiService;
	private final Validator validator;
	private final ApplicationEventPublisher eventi;
	private final Clock clock;

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

	/**
	 * SegnaChatLetta su tutte le chat dell'utente in due UPDATE, invece di tre query per chat:
	 * serve a SegnaTutteLette per la categoria chats (sezione 10).
	 */
	@Transactional
	public void segnaTutteLette(UUID utenteId) {
		messaggioRepository.segnaTuttiLettiDellAltro(utenteId);
		notificaChatRepository.segnaTutteLette(utenteId);
	}

	/**
	 * InviaMessaggio (sezione 11). I controlli si ripetono a ogni invio, nell'ordine della
	 * progettazione: la connessione resta aperta anche dopo logout, sospensione o cambio password.
	 * Il messaggio arriva ai due utenti solo dopo il commit (MessaggioLiveListener).
	 */
	@Transactional
	public void invia(UUID chatId, InviaMessaggioRequest richiesta, UtenteAutenticato utente) {
		if (!tokenService.ancoraValido(utente)) {
			throw new ApplicazioneException(CodiceErrore.TOKEN_NON_VALIDO, "Token scaduto o revocato");
		}
		limitiService.consuma(Limite.MESSAGGI_CHAT, utente.id().toString());
		if (richiesta == null || !validator.validate(richiesta).isEmpty()) {
			throw new ApplicazioneException(CodiceErrore.VALIDAZIONE, "Uno o piu' campi non sono validi");
		}
		Chat chat = caricaDaMembro(chatId, utente.id());
		Amicizia amicizia = chat.getAmicizia();
		if (!puoiScrivere(amicizia)) {
			throw new ApplicazioneException(CodiceErrore.CHAT_SOLA_LETTURA, "In questa chat non puoi piu' scrivere");
		}

		boolean sonoRichiedente = amicizia.getRichiedente().getId().equals(utente.id());
		Utente mittente = sonoRichiedente ? amicizia.getRichiedente() : amicizia.getRicevente();
		Utente destinatario = sonoRichiedente ? amicizia.getRicevente() : amicizia.getRichiedente();
		Instant adesso = clock.instant();

		Messaggio messaggio = new Messaggio();
		messaggio.setChat(chat);
		messaggio.setMittente(mittente);
		messaggio.setTesto(richiesta.testo());
		messaggio.setInviatoIl(adesso);
		messaggio = messaggioRepository.save(messaggio);
		notificaChatRepository.segnaNonLetta(chatId, destinatario.getId(), adesso);

		eventi.publishEvent(new MessaggioLiveEvent(mittente.getId(), destinatario.getId(),
				MessaggioResponse.da(messaggio)));
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
		Utente amico = sonoRichiedente ? amicizia.getRicevente() : amicizia.getRichiedente();
		return new ChatResponse(
				chat.getId(),
				UtentePubblicoResponse.da(amico),
				ultimo == null ? null : ChatResponse.UltimoMessaggio.da(ultimo),
				nonLetti,
				puoiScrivere(amicizia));
	}

	// puoiScrivere di ChatResponse e controllo CHAT_SOLA_LETTURA di InviaMessaggio: stessa regola.
	private static boolean puoiScrivere(Amicizia amicizia) {
		return amicizia.getStato() == StatoAmicizia.ACCETTATA
				&& amicizia.getRichiedente().getStato() == StatoUtente.ATTIVO
				&& amicizia.getRicevente().getStato() == StatoUtente.ATTIVO;
	}

	private Instant ultimaAttivita(Chat chat, Messaggio ultimo) {
		return ultimo == null ? chat.getCreataIl() : ultimo.getInviatoIl();
	}
}
