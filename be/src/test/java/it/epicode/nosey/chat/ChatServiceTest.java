package it.epicode.nosey.chat;

import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.friendship.AmiciziaRepository;
import it.epicode.nosey.friendship.StatoAmicizia;
import it.epicode.nosey.notification.NotificaChat;
import it.epicode.nosey.notification.NotificaChatRepository;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Limit;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Chat (progettazione v4, sezione 9): ListaChat con ordine, nonLetti e puoiScrivere, ListaMessaggi
 * con il cursore (nessun doppione scorrendo all'indietro), SegnaChatLetta e InviaMessaggio (sezione 11,
 * senza il WebSocket: il push dopo il commit e' in ChatWebSocketTest), con i loro errori.
 * Test di integrazione sul database locale (decisione 10): ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class ChatServiceTest {

	private static final Instant T0 = Instant.parse("2026-09-01T10:00:00Z");

	@Autowired
	private ChatService chatService;
	@Autowired
	private ChatRepository chatRepository;
	@Autowired
	private MessaggioRepository messaggioRepository;
	@Autowired
	private NotificaChatRepository notificaChatRepository;
	@Autowired
	private AmiciziaRepository amiciziaRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private TokenService tokenService;
	@Autowired
	private EntityManager entityManager;

	private Utente mario;
	private Utente luigi;
	private Utente anna;
	private Evento evento;

	@BeforeEach
	void prepara() {
		mario = utente("Mario", "Rossi");
		luigi = utente("Luigi", "Verdi");
		anna = utente("Anna", "Bianchi");
		evento = evento(anna);
	}

	// --- ListaChat ---

	@Test
	void lista_soloLeChatDellUtente_conAmicoEUltimoMessaggio() {
		Chat conLuigi = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		chat(amicizia(luigi, anna, StatoAmicizia.ACCETTATA), T0);
		messaggio(conLuigi, mario, "ciao", T0.plusSeconds(10));
		Messaggio ultimo = messaggio(conLuigi, luigi, "ciao a te", T0.plusSeconds(20));

		List<ChatResponse> lista = chatService.lista(mario.getId());

		assertThat(lista).singleElement().satisfies(c -> {
			assertThat(c.id()).isEqualTo(conLuigi.getId());
			assertThat(c.amico().id()).isEqualTo(luigi.getId());
			assertThat(c.ultimoMessaggio().testo()).isEqualTo("ciao a te");
			assertThat(c.ultimoMessaggio().mittenteId()).isEqualTo(luigi.getId());
			assertThat(c.ultimoMessaggio().inviatoIl()).isEqualTo(ultimo.getInviatoIl());
		});
		// Vista dall'altro membro: l'amico e' Mario.
		assertThat(chatService.lista(luigi.getId()))
				.anySatisfy(c -> assertThat(c.amico().id()).isEqualTo(mario.getId()));
	}

	@Test
	void lista_senzaChat_vuota() {
		assertThat(chatService.lista(mario.getId())).isEmpty();
	}

	@Test
	void lista_perUltimaAttivita_ancheLeChatSenzaMessaggi() {
		Utente paolo = utente("Paolo", "Neri");
		Chat vecchia = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		messaggio(vecchia, luigi, "vecchio", T0.plus(Duration.ofHours(1)));
		Chat vuota = chat(amicizia(mario, anna, StatoAmicizia.ACCETTATA), T0.plus(Duration.ofHours(2)));
		Chat recente = chat(amicizia(paolo, mario, StatoAmicizia.ACCETTATA), T0);
		messaggio(recente, paolo, "recente", T0.plus(Duration.ofHours(3)));

		List<ChatResponse> lista = chatService.lista(mario.getId());

		assertThat(lista).extracting(ChatResponse::id)
				.containsExactly(recente.getId(), vuota.getId(), vecchia.getId());
		assertThat(lista.get(1).ultimoMessaggio()).isNull();
		assertThat(lista.get(1).nonLetti()).isZero();
	}

	@Test
	void lista_nonLetti_soloIMessaggiDellAltroNonLetti() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		messaggio(chat, luigi, "1", T0.plusSeconds(1));
		messaggio(chat, luigi, "2", T0.plusSeconds(2));
		messaggio(chat, mario, "mio, non letto da Luigi", T0.plusSeconds(3));
		messaggio(chat, luigi, "gia' letto", T0.plusSeconds(4)).setLetto(true);
		messaggioRepository.flush();

		assertThat(chatService.lista(mario.getId())).singleElement()
				.satisfies(c -> assertThat(c.nonLetti()).isEqualTo(2));
		assertThat(chatService.lista(luigi.getId())).singleElement()
				.satisfies(c -> assertThat(c.nonLetti()).isEqualTo(1));
	}

	@Test
	void lista_puoiScrivere_soloAmiciziaAccettataEUtentiAttivi() {
		Utente paolo = utente("Paolo", "Neri");
		Chat attiva = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		Chat rimossa = chat(amicizia(mario, anna, StatoAmicizia.RIMOSSA), T0);
		Chat conSospeso = chat(amicizia(paolo, mario, StatoAmicizia.ACCETTATA), T0);
		paolo.setStato(StatoUtente.SOSPESO);
		utenteRepository.flush();

		List<ChatResponse> lista = chatService.lista(mario.getId());

		assertThat(lista).hasSize(3);
		assertThat(puoiScrivere(lista, attiva)).isTrue();
		assertThat(puoiScrivere(lista, rimossa)).isFalse();
		assertThat(puoiScrivere(lista, conSospeso)).isFalse();
		assertThat(lista).filteredOn(c -> c.id().equals(conSospeso.getId())).singleElement()
				.satisfies(c -> assertThat(c.amico().attivo()).isFalse());

		// Anche chi chiede deve essere ATTIVO.
		mario.setStato(StatoUtente.SOSPESO);
		utenteRepository.flush();
		assertThat(puoiScrivere(chatService.lista(mario.getId()), attiva)).isFalse();
	}

	// --- ListaMessaggi ---

	@Test
	void messaggi_primaPagina_dalPiuRecente_conAltri() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		for (int i = 1; i <= 5; i++) {
			messaggio(chat, i % 2 == 0 ? mario : luigi, "m" + i, T0.plusSeconds(i));
		}

		MessaggiResponse pagina = chatService.messaggi(chat.getId(), null, 3, mario.getId());

		assertThat(pagina.messaggi()).extracting(MessaggioResponse::testo).containsExactly("m5", "m4", "m3");
		assertThat(pagina.messaggi()).allSatisfy(m -> assertThat(m.chatId()).isEqualTo(chat.getId()));
		assertThat(pagina.altri()).isTrue();

		MessaggiResponse tutti = chatService.messaggi(chat.getId(), null, 5, mario.getId());
		assertThat(tutti.messaggi()).hasSize(5);
		assertThat(tutti.altri()).isFalse();
	}

	@Test
	void messaggi_cursore_nessunDoppione_conStessoIstanteEMessaggiNuovi() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		// Tre messaggi nello stesso istante: l'id li separa, nessuno si perde e nessuno si ripete.
		messaggio(chat, mario, "a", T0.plusSeconds(1));
		messaggio(chat, luigi, "b", T0.plusSeconds(2));
		messaggio(chat, mario, "c", T0.plusSeconds(2));
		messaggio(chat, luigi, "d", T0.plusSeconds(2));
		messaggio(chat, mario, "e", T0.plusSeconds(3));
		messaggio(chat, luigi, "f", T0.plusSeconds(4));
		List<UUID> attesi = chatService.messaggi(chat.getId(), null, 100, mario.getId()).messaggi().stream()
				.map(MessaggioResponse::id)
				.toList();

		List<UUID> letti = new ArrayList<>();
		MessaggiResponse pagina = chatService.messaggi(chat.getId(), null, 2, mario.getId());
		letti.addAll(pagina.messaggi().stream().map(MessaggioResponse::id).toList());
		// Arrivano messaggi nuovi mentre si scorre: con un offset la pagina successiva li ripeterebbe.
		messaggio(chat, luigi, "nuovo 1", T0.plusSeconds(10));
		messaggio(chat, mario, "nuovo 2", T0.plusSeconds(11));
		while (pagina.altri()) {
			UUID before = pagina.messaggi().getLast().id();
			pagina = chatService.messaggi(chat.getId(), before, 2, mario.getId());
			letti.addAll(pagina.messaggi().stream().map(MessaggioResponse::id).toList());
		}

		assertThat(letti).doesNotHaveDuplicates().containsExactlyElementsOf(attesi);
	}

	@Test
	void messaggi_ancheInSolaLettura() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.RIMOSSA), T0);
		messaggio(chat, luigi, "prima della rimozione", T0.plusSeconds(1));

		assertThat(chatService.messaggi(chat.getId(), null, 30, mario.getId()).messaggi()).hasSize(1);
	}

	@Test
	void messaggi_errori() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		Chat altra = chat(amicizia(luigi, anna, StatoAmicizia.ACCETTATA), T0);
		Messaggio dellAltra = messaggio(altra, anna, "altrove", T0.plusSeconds(1));

		assertErrore(CodiceErrore.NON_TROVATO,
				() -> chatService.messaggi(UUID.randomUUID(), null, 30, mario.getId()));
		assertErrore(CodiceErrore.NON_MEMBRO,
				() -> chatService.messaggi(chat.getId(), null, 30, anna.getId()));
		// NON_MEMBRO viene prima del controllo su before.
		assertErrore(CodiceErrore.NON_MEMBRO,
				() -> chatService.messaggi(chat.getId(), UUID.randomUUID(), 30, anna.getId()));
		assertErrore(CodiceErrore.NON_TROVATO,
				() -> chatService.messaggi(chat.getId(), UUID.randomUUID(), 30, mario.getId()));
		assertErrore(CodiceErrore.NON_TROVATO,
				() -> chatService.messaggi(chat.getId(), dellAltra.getId(), 30, mario.getId()));
	}

	// --- SegnaChatLetta ---

	@Test
	void segnaLetta_soloIMessaggiDellAltroELaPropriaNotifica() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		Messaggio diLuigi = messaggio(chat, luigi, "per Mario", T0.plusSeconds(1));
		Messaggio diMario = messaggio(chat, mario, "per Luigi", T0.plusSeconds(2));
		NotificaChat perMario = notifica(mario, chat);
		NotificaChat perLuigi = notifica(luigi, chat);

		chatService.segnaLetta(chat.getId(), mario.getId());
		entityManager.clear();

		assertThat(messaggioRepository.findById(diLuigi.getId()).orElseThrow().isLetto()).isTrue();
		assertThat(messaggioRepository.findById(diMario.getId()).orElseThrow().isLetto()).isFalse();
		assertThat(notificaChatRepository.findById(perMario.getId()).orElseThrow().isLetta()).isTrue();
		assertThat(notificaChatRepository.findById(perLuigi.getId()).orElseThrow().isLetta()).isFalse();
		assertThat(chatService.lista(mario.getId())).singleElement()
				.satisfies(c -> assertThat(c.nonLetti()).isZero());
	}

	@Test
	void segnaLetta_ancheInSolaLetturaESenzaNotifica() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.RIMOSSA), T0);
		Messaggio diLuigi = messaggio(chat, luigi, "per Mario", T0.plusSeconds(1));

		chatService.segnaLetta(chat.getId(), mario.getId());
		entityManager.clear();

		assertThat(messaggioRepository.findById(diLuigi.getId()).orElseThrow().isLetto()).isTrue();
	}

	@Test
	void segnaLetta_errori() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);

		assertErrore(CodiceErrore.NON_TROVATO, () -> chatService.segnaLetta(UUID.randomUUID(), mario.getId()));
		assertErrore(CodiceErrore.NON_MEMBRO, () -> chatService.segnaLetta(chat.getId(), anna.getId()));
	}

	// --- InviaMessaggio ---

	@Test
	void invia_salvaIlMessaggioERiapreLaNotificaDelDestinatario() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		NotificaChat perLuigi = notifica(luigi, chat);
		perLuigi.setLetta(true);
		notificaChatRepository.saveAndFlush(perLuigi);

		chatService.invia(chat.getId(), new InviaMessaggioRequest("ciao Luigi"), autenticato(mario));
		entityManager.clear();

		MessaggiResponse messaggi = chatService.messaggi(chat.getId(), null, 30, luigi.getId());
		assertThat(messaggi.messaggi()).singleElement().satisfies(m -> {
			assertThat(m.mittenteId()).isEqualTo(mario.getId());
			assertThat(m.testo()).isEqualTo("ciao Luigi");
			assertThat(m.letto()).isFalse();
		});
		NotificaChat notifica = notificaChatRepository.findById(perLuigi.getId()).orElseThrow();
		assertThat(notifica.isLetta()).isFalse();
		assertThat(notifica.getAggiornataIl()).isAfter(T0);
		// Solo il destinatario: il mittente non riceve una NOTIFICA_CHAT per i propri messaggi.
		assertThat(notificaChatRepository.findAll()).noneMatch(n -> n.getDestinatario().getId().equals(mario.getId()));
	}

	@Test
	void invia_senzaNotificaDelDestinatario_laCrea() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);

		chatService.invia(chat.getId(), new InviaMessaggioRequest("ciao"), autenticato(luigi));
		entityManager.clear();

		assertThat(notificaChatRepository.findAll())
				.filteredOn(n -> n.getChat().getId().equals(chat.getId()))
				.singleElement()
				.satisfies(n -> {
					assertThat(n.getDestinatario().getId()).isEqualTo(mario.getId());
					assertThat(n.isLetta()).isFalse();
				});
	}

	@Test
	void invia_controlliNellOrdineDellaProgettazione() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		InviaMessaggioRequest vuoto = new InviaMessaggioRequest(" ");
		InviaMessaggioRequest valido = new InviaMessaggioRequest("ciao");

		// 1. token: prima di tutto il resto, anche con testo non valido e chat non sua.
		UtenteAutenticato scaduto = new UtenteAutenticato(anna.getId(), "USER", UUID.randomUUID(),
				Instant.now().minusSeconds(1));
		assertErrore(CodiceErrore.TOKEN_NON_VALIDO, () -> chatService.invia(chat.getId(), vuoto, scaduto));
		UtenteAutenticato revocato = autenticato(anna);
		tokenService.revocaTutti(anna.getId());
		assertErrore(CodiceErrore.TOKEN_NON_VALIDO, () -> chatService.invia(chat.getId(), vuoto, revocato));

		// 3. validazione prima dell'appartenenza alla chat.
		UtenteAutenticato annaValida = autenticato(anna);
		assertErrore(CodiceErrore.VALIDAZIONE, () -> chatService.invia(chat.getId(), vuoto, annaValida));
		assertErrore(CodiceErrore.VALIDAZIONE, () -> chatService.invia(chat.getId(), null, annaValida));
		assertErrore(CodiceErrore.VALIDAZIONE, () -> chatService.invia(chat.getId(),
				new InviaMessaggioRequest("x".repeat(2001)), annaValida));

		// 4. membro della chat.
		assertErrore(CodiceErrore.NON_TROVATO, () -> chatService.invia(UUID.randomUUID(), valido, annaValida));
		assertErrore(CodiceErrore.NON_MEMBRO, () -> chatService.invia(chat.getId(), valido, annaValida));

		assertThat(messaggioRepository.trovaPiuRecenti(chat.getId(), Limit.of(10))).isEmpty();
	}

	@Test
	void invia_testoLungoAlMassimo_accettato() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);

		chatService.invia(chat.getId(), new InviaMessaggioRequest("x".repeat(2000)), autenticato(mario));

		assertThat(messaggioRepository.trovaPiuRecenti(chat.getId(), Limit.of(10))).hasSize(1);
	}

	@Test
	void invia_chatInSolaLettura_rifiutato() {
		Chat rimossa = chat(amicizia(mario, luigi, StatoAmicizia.RIMOSSA), T0);
		Chat conAnna = chat(amicizia(mario, anna, StatoAmicizia.ACCETTATA), T0);
		anna.setStato(StatoUtente.SOSPESO);
		utenteRepository.saveAndFlush(anna);
		InviaMessaggioRequest valido = new InviaMessaggioRequest("ciao");
		UtenteAutenticato autenticatoMario = autenticato(mario);

		assertErrore(CodiceErrore.CHAT_SOLA_LETTURA, () -> chatService.invia(rimossa.getId(), valido, autenticatoMario));
		assertErrore(CodiceErrore.CHAT_SOLA_LETTURA, () -> chatService.invia(conAnna.getId(), valido, autenticatoMario));
		assertThat(messaggioRepository.trovaPiuRecenti(rimossa.getId(), Limit.of(10))).isEmpty();
		assertThat(messaggioRepository.trovaPiuRecenti(conAnna.getId(), Limit.of(10))).isEmpty();
	}

	@Test
	void invia_trentaMessaggiAlMinuto_poiTroppeRichiesteAncheConTestoNonValido() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA), T0);
		UtenteAutenticato autenticatoMario = autenticato(mario);
		for (int i = 0; i < 30; i++) {
			chatService.invia(chat.getId(), new InviaMessaggioRequest("messaggio " + i), autenticatoMario);
		}

		// 2. il limite viene prima della validazione.
		assertErrore(CodiceErrore.TROPPE_RICHIESTE,
				() -> chatService.invia(chat.getId(), new InviaMessaggioRequest(" "), autenticatoMario));
		// Il limite e' per utente: Luigi scrive ancora.
		chatService.invia(chat.getId(), new InviaMessaggioRequest("risposta"), autenticato(luigi));
	}

	// --- Supporto ---

	private UtenteAutenticato autenticato(Utente utente) {
		return tokenService.verifica(tokenService.emetti(utente).token()).orElseThrow();
	}

	private boolean puoiScrivere(List<ChatResponse> lista, Chat chat) {
		return lista.stream().filter(c -> c.id().equals(chat.getId())).findFirst().orElseThrow().puoiScrivere();
	}

	private void assertErrore(CodiceErrore codice, Executable chiamata) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, chiamata);
		assertThat(ex.getCodiceErrore()).isEqualTo(codice);
	}

	private Messaggio messaggio(Chat chat, Utente mittente, String testo, Instant inviatoIl) {
		Messaggio messaggio = new Messaggio();
		messaggio.setChat(chat);
		messaggio.setMittente(mittente);
		messaggio.setTesto(testo);
		messaggio.setInviatoIl(inviatoIl);
		return messaggioRepository.saveAndFlush(messaggio);
	}

	private NotificaChat notifica(Utente destinatario, Chat chat) {
		NotificaChat notifica = new NotificaChat();
		notifica.setDestinatario(destinatario);
		notifica.setChat(chat);
		notifica.setAggiornataIl(T0);
		return notificaChatRepository.saveAndFlush(notifica);
	}

	private Chat chat(Amicizia amicizia, Instant creataIl) {
		Chat chat = new Chat();
		chat.setAmicizia(amicizia);
		chat.setCreataIl(creataIl);
		return chatRepository.saveAndFlush(chat);
	}

	private Amicizia amicizia(Utente richiedente, Utente ricevente, StatoAmicizia stato) {
		Amicizia amicizia = new Amicizia();
		amicizia.setRichiedente(richiedente);
		amicizia.setRicevente(ricevente);
		amicizia.setEvento(evento);
		amicizia.setStato(stato);
		if (stato == StatoAmicizia.RIMOSSA) {
			amicizia.setChiusaDa(ricevente);
		}
		amicizia.setCreataIl(T0);
		amicizia.setAggiornataIl(T0);
		return amiciziaRepository.saveAndFlush(amicizia);
	}

	private Utente utente(String nome, String cognome) {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome("USER").orElseThrow());
		utente.setEmail("test-" + UUID.randomUUID() + "@nosey.test");
		utente.setPasswordHash("non-usata");
		utente.setNome(nome);
		utente.setCognome(cognome);
		utente.setVerificato(true);
		utente.setCreatoIl(Instant.now());
		return utenteRepository.save(utente);
	}

	private Evento evento(Utente proprietario) {
		Evento evento = new Evento();
		evento.setProprietario(proprietario);
		evento.setTitolo("Concerto al parco");
		evento.setDataEvento(Instant.now().plus(Duration.ofDays(7)));
		evento.setDataFine(Instant.now().plus(Duration.ofDays(8)));
		evento.setLat(45.07);
		evento.setLng(7.69);
		evento.setCreatoIl(Instant.now());
		return eventoRepository.save(evento);
	}
}
