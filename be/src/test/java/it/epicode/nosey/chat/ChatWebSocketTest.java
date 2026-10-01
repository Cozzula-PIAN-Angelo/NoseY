package it.epicode.nosey.chat;

import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.friendship.AmiciziaRepository;
import it.epicode.nosey.friendship.StatoAmicizia;
import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * InviaMessaggio e ricezione live (progettazione v4, sezione 11) con veri client STOMP sul server
 * avviato su una porta casuale: due utenti si scambiano messaggi in tempo reale. Come in
 * WebSocketSicurezzaTest i dati vanno salvati davvero e vengono cancellati alla fine di ogni test.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ChatWebSocketTest {

	private static final long ATTESA_SECONDI = 5;

	@LocalServerPort
	private int porta;
	@Autowired
	private TokenService tokenService;
	@Autowired
	private NotificheService notificheService;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private AmiciziaRepository amiciziaRepository;
	@Autowired
	private ChatRepository chatRepository;
	@Autowired
	private SimpMessagingTemplate messagingTemplate;
	@Autowired
	private JdbcTemplate jdbcTemplate;

	private WebSocketStompClient client;
	private final List<UUID> utentiCreati = new ArrayList<>();
	private final List<StompSession> sessioni = new ArrayList<>();

	private Utente mario;
	private Utente luigi;
	private Amicizia amicizia;
	private Chat chat;

	@BeforeEach
	void prepara() {
		client = new WebSocketStompClient(new StandardWebSocketClient());
		client.setMessageConverter(new JacksonJsonMessageConverter());
		mario = utente("Mario", "Rossi");
		luigi = utente("Luigi", "Verdi");
		Evento evento = evento(mario);
		amicizia = amicizia(mario, luigi, evento);
		chat = chat(amicizia);
	}

	@AfterEach
	void pulisci() {
		sessioni.stream().filter(StompSession::isConnected).forEach(StompSession::disconnect);
		client.stop();
		for (UUID id : utentiCreati) {
			jdbcTemplate.update("delete from messaggio where mittente_id = ?", id);
			jdbcTemplate.update("delete from notifica_chat where destinatario_id = ?", id);
			jdbcTemplate.update("delete from notifica_amicizia where destinatario_id = ?", id);
		}
		jdbcTemplate.update("delete from chat where id = ?", chat.getId());
		jdbcTemplate.update("delete from amicizia where id = ?", amicizia.getId());
		jdbcTemplate.update("delete from evento where id = ?", amicizia.getEvento().getId());
		for (UUID id : utentiCreati) {
			jdbcTemplate.update("delete from token_jwt where utente_id = ?", id);
			jdbcTemplate.update("delete from utente where id = ?", id);
		}
	}

	@Test
	void dueUtenti_siScambianoMessaggiInTempoReale() throws Exception {
		StompSession sessioneMario = connetti(token(mario));
		StompSession sessioneLuigi = connetti(token(luigi));
		BlockingQueue<Map<String, Object>> messaggiMario = iscrivi(sessioneMario, "/user/queue/messages", mario);
		BlockingQueue<Map<String, Object>> messaggiLuigi = iscrivi(sessioneLuigi, "/user/queue/messages", luigi);

		sessioneMario.send(invio(), Map.of("testo", "ciao Luigi"));

		// Lo stesso MessaggioResponse a tutti e due: al mittente serve per confermare l'invio.
		Map<String, Object> ricevutoDaLuigi = messaggiLuigi.poll(ATTESA_SECONDI, TimeUnit.SECONDS);
		assertThat(ricevutoDaLuigi)
				.containsEntry("chatId", chat.getId().toString())
				.containsEntry("mittenteId", mario.getId().toString())
				.containsEntry("testo", "ciao Luigi")
				.containsEntry("letto", false)
				.containsKeys("id", "inviatoIl");
		assertThat(messaggiMario.poll(ATTESA_SECONDI, TimeUnit.SECONDS)).isEqualTo(ricevutoDaLuigi);

		sessioneLuigi.send(invio(), Map.of("testo", "ciao Mario"));

		assertThat(messaggiMario.poll(ATTESA_SECONDI, TimeUnit.SECONDS))
				.containsEntry("mittenteId", luigi.getId().toString())
				.containsEntry("testo", "ciao Mario");
		assertThat(messaggiLuigi.poll(ATTESA_SECONDI, TimeUnit.SECONDS))
				.containsEntry("testo", "ciao Mario");
		// Una NOTIFICA_CHAT non letta per ciascuno: ognuno ha un messaggio dell'altro da leggere.
		assertThat(jdbcTemplate.queryForObject(
				"select count(*) from notifica_chat where chat_id = ? and letta = false", Long.class, chat.getId()))
				.isEqualTo(2);
	}

	@Test
	void chatInSolaLettura_erroreSullaCodaErroriENessunMessaggio() throws Exception {
		amicizia.setStato(StatoAmicizia.RIMOSSA);
		amicizia.setChiusaDa(luigi);
		amiciziaRepository.save(amicizia);
		StompSession sessione = connetti(token(mario));
		BlockingQueue<Map<String, Object>> errori = iscrivi(sessione, "/user/queue/errors", mario);
		BlockingQueue<Map<String, Object>> messaggi = iscrivi(sessione, "/user/queue/messages", mario);

		sessione.send(invio(), Map.of("testo", "ciao"));

		assertThat(errori.poll(ATTESA_SECONDI, TimeUnit.SECONDS)).containsEntry("codice", "CHAT_SOLA_LETTURA");
		assertThat(messaggi.poll(500, TimeUnit.MILLISECONDS)).isNull();
		assertThat(sessione.isConnected()).isTrue();
	}

	@Test
	void tokenRevocatoDopoIlConnect_tokenNonValidoAlSend() throws Exception {
		StompSession sessione = connetti(token(mario));
		BlockingQueue<Map<String, Object>> errori = iscrivi(sessione, "/user/queue/errors", mario);
		tokenService.revocaTutti(mario.getId());

		sessione.send(invio(), Map.of("testo", "ciao"));

		assertThat(errori.poll(ATTESA_SECONDI, TimeUnit.SECONDS)).containsEntry("codice", "TOKEN_NON_VALIDO");
		assertThat(jdbcTemplate.queryForObject(
				"select count(*) from messaggio where chat_id = ?", Long.class, chat.getId())).isZero();
	}

	@Test
	void notificaCreata_arrivaLiveDopoIlCommit() throws Exception {
		StompSession sessione = connetti(token(luigi));
		BlockingQueue<Map<String, Object>> notifiche = iscrivi(sessione, "/user/queue/notifications", luigi);

		// Transazione propria del service: il push parte al suo commit.
		notificheService.notificaRichiestaAmicizia(amicizia);

		assertThat(notifiche.poll(ATTESA_SECONDI, TimeUnit.SECONDS))
				.containsEntry("categoria", "friendships")
				.containsEntry("tipo", "RICHIESTA")
				.containsEntry("riferimentoId", amicizia.getId().toString())
				.containsEntry("testo", "Mario Rossi ti ha chiesto l'amicizia");
	}

	// --- Supporto ---

	private String invio() {
		return "/app/chats/" + chat.getId() + "/send";
	}

	private StompSession connetti(String token) throws Exception {
		StompHeaders intestazioni = new StompHeaders();
		intestazioni.add("Authorization", "Bearer " + token);
		StompSession sessione = client.connectAsync(url(), new WebSocketHttpHeaders(), intestazioni,
				new StompSessionHandlerAdapter() {
				}).get(ATTESA_SECONDI, TimeUnit.SECONDS);
		sessioni.add(sessione);
		return sessione;
	}

	/**
	 * La SUBSCRIBE e' asincrona: il server manda messaggi di controllo finche' il primo non arriva,
	 * cosi' all'uscita la coda e' registrata davvero (e svuotata).
	 */
	private BlockingQueue<Map<String, Object>> iscrivi(StompSession sessione, String destinazione, Utente utente)
			throws InterruptedException {
		BlockingQueue<Map<String, Object>> ricevuti = new LinkedBlockingQueue<>();
		sessione.subscribe(destinazione, gestore(ricevuti));
		String coda = destinazione.substring("/user".length());
		Instant limite = Instant.now().plusSeconds(ATTESA_SECONDI);
		while (ricevuti.isEmpty() && Instant.now().isBefore(limite)) {
			messagingTemplate.convertAndSendToUser(utente.getId().toString(), coda, Map.of("controllo", 1));
			Thread.sleep(100);
		}
		assertThat(ricevuti).as("iscrizione a " + destinazione).isNotEmpty();
		Thread.sleep(200);
		ricevuti.clear();
		return ricevuti;
	}

	private StompFrameHandler gestore(BlockingQueue<Map<String, Object>> ricevuti) {
		return new StompFrameHandler() {
			@Override
			public Type getPayloadType(StompHeaders headers) {
				return Map.class;
			}

			@Override
			@SuppressWarnings("unchecked")
			public void handleFrame(StompHeaders headers, Object payload) {
				ricevuti.add((Map<String, Object>) payload);
			}
		};
	}

	private String url() {
		return "ws://localhost:" + porta + "/ws";
	}

	private String token(Utente utente) {
		return tokenService.emetti(utente).token();
	}

	private Chat chat(Amicizia amicizia) {
		Chat chat = new Chat();
		chat.setAmicizia(amicizia);
		chat.setCreataIl(Instant.now());
		return chatRepository.save(chat);
	}

	private Amicizia amicizia(Utente richiedente, Utente ricevente, Evento evento) {
		Amicizia amicizia = new Amicizia();
		amicizia.setRichiedente(richiedente);
		amicizia.setRicevente(ricevente);
		amicizia.setEvento(evento);
		amicizia.setStato(StatoAmicizia.ACCETTATA);
		amicizia.setCreataIl(Instant.now());
		amicizia.setAggiornataIl(Instant.now());
		return amiciziaRepository.save(amicizia);
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
		utente = utenteRepository.save(utente);
		utentiCreati.add(utente.getId());
		return utente;
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
