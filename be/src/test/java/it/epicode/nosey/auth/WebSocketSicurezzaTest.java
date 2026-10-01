package it.epicode.nosey.auth;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Sicurezza del WebSocket (progettazione v4, sezione 11) con un vero client STOMP sul server
 * avviato su una porta casuale. Il server legge il database in altri thread: i dati vanno
 * salvati davvero (niente @Transactional) e vengono cancellati alla fine di ogni test.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(WebSocketSicurezzaTest.ControllerDiProva.class)
class WebSocketSicurezzaTest {

	private static final long ATTESA_SECONDI = 5;

	@LocalServerPort
	private int porta;
	@Autowired
	private TokenService tokenService;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private SimpMessagingTemplate messagingTemplate;
	@Autowired
	private JdbcTemplate jdbcTemplate;

	private WebSocketStompClient client;
	private final List<UUID> utentiCreati = new ArrayList<>();
	private final List<StompSession> sessioni = new ArrayList<>();

	@BeforeEach
	void prepara() {
		client = new WebSocketStompClient(new StandardWebSocketClient());
		client.setMessageConverter(new JacksonJsonMessageConverter());
	}

	@AfterEach
	void pulisci() {
		sessioni.stream().filter(StompSession::isConnected).forEach(StompSession::disconnect);
		client.stop();
		for (UUID id : utentiCreati) {
			jdbcTemplate.update("delete from token_jwt where utente_id = ?", id);
			jdbcTemplate.update("delete from utente where id = ?", id);
		}
	}

	@Test
	void sendVersoLaCodaDiUnAltroUtente_rifiutatoENonRecapitato() throws Exception {
		Utente mario = utente();
		Utente luigi = utente();
		StompSession sessioneMario = connetti(token(mario));
		StompSession sessioneLuigi = connetti(token(luigi));
		BlockingQueue<Map<String, Object>> erroriMario = iscrivi(sessioneMario, "/user/queue/errors", mario);
		BlockingQueue<Map<String, Object>> messaggiLuigi = iscrivi(sessioneLuigi, "/user/queue/messages", luigi);

		sessioneMario.send("/user/" + luigi.getId() + "/queue/messages", Map.of("testo", "messaggio falso"));

		Map<String, Object> errore = erroriMario.poll(ATTESA_SECONDI, TimeUnit.SECONDS);
		assertThat(errore).containsEntry("codice", "ACCESSO_NEGATO");
		// Un messaggio del server mandato DOPO il rifiuto: deve essere il primo che Luigi riceve.
		messagingTemplate.convertAndSendToUser(luigi.getId().toString(), "/queue/messages", Map.of("controllo", 2));
		assertThat(messaggiLuigi.poll(ATTESA_SECONDI, TimeUnit.SECONDS)).isEqualTo(Map.of("controllo", 2));
		assertThat(sessioneMario.isConnected()).isTrue();
	}

	@Test
	void subscribeFuoriDalleCodeDellUtente_rifiutata() throws Exception {
		Utente mario = utente();
		StompSession sessione = connetti(token(mario));
		BlockingQueue<Map<String, Object>> errori = iscrivi(sessione, "/user/queue/errors", mario);

		sessione.subscribe("/queue/messages", gestore(new LinkedBlockingQueue<>()));

		assertThat(errori.poll(ATTESA_SECONDI, TimeUnit.SECONDS))
				.containsEntry("codice", "ACCESSO_NEGATO")
				.containsEntry("messaggio", "SUBSCRIBE non ammesso verso /queue/messages");
	}

	@Test
	void eccezioneInUnMessageMapping_vaSullaCodaErrori() throws Exception {
		Utente mario = utente();
		StompSession sessione = connetti(token(mario));
		BlockingQueue<Map<String, Object>> errori = iscrivi(sessione, "/user/queue/errors", mario);

		sessione.send("/app/prova/errore", Map.of());

		assertThat(errori.poll(ATTESA_SECONDI, TimeUnit.SECONDS))
				.containsEntry("codice", "NON_MEMBRO")
				.containsEntry("messaggio", "errore di prova");
		assertThat(sessione.isConnected()).isTrue();
	}

	@Test
	void connectSenzaToken_rifiutatoConTokenNonValido() {
		assertConnessioneRifiutata(null);
	}

	@Test
	void connectConTokenRevocato_rifiutato() {
		Utente mario = utente();
		String token = token(mario);
		tokenService.revocaTutti(mario.getId());

		assertConnessioneRifiutata(token);
	}

	@Test
	void connectDiUnUtenteSospeso_rifiutato() {
		Utente mario = utente();
		String token = token(mario);
		mario.setStato(StatoUtente.SOSPESO);
		utenteRepository.save(mario);

		assertConnessioneRifiutata(token);
	}

	/** Il server risponde al CONNECT con un frame ERROR (header message = codice) e chiude. */
	private void assertConnessioneRifiutata(String token) {
		CompletableFuture<StompHeaders> intestazioniErrore = new CompletableFuture<>();
		CompletableFuture<Object> corpoErrore = new CompletableFuture<>();
		StompHeaders intestazioni = new StompHeaders();
		if (token != null) {
			intestazioni.add("Authorization", "Bearer " + token);
		}
		CompletableFuture<StompSession> connessione = client.connectAsync(url(), new WebSocketHttpHeaders(),
				intestazioni, new StompSessionHandlerAdapter() {
					@Override
					public Type getPayloadType(StompHeaders headers) {
						return Map.class;
					}

					@Override
					public void handleFrame(StompHeaders headers, Object payload) {
						intestazioniErrore.complete(headers);
						corpoErrore.complete(payload);
					}
				});

		assertThatThrownBy(() -> connessione.get(ATTESA_SECONDI, TimeUnit.SECONDS))
				.isInstanceOf(ExecutionException.class);
		assertThat(intestazioniErrore.join().getFirst("message")).isEqualTo("TOKEN_NON_VALIDO");
		assertThat(corpoErrore.join()).isEqualTo(Map.of(
				"codice", "TOKEN_NON_VALIDO", "messaggio", "Token mancante, scaduto o revocato"));
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

	private Utente utente() {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome("USER").orElseThrow());
		utente.setEmail("test-" + UUID.randomUUID() + "@nosey.test");
		utente.setPasswordHash("non-usata");
		utente.setNome("Mario");
		utente.setCognome("Rossi");
		utente.setVerificato(true);
		utente.setCreatoIl(Instant.now());
		utente = utenteRepository.save(utente);
		utentiCreati.add(utente.getId());
		return utente;
	}

	/** Un @MessageMapping che fallisce: verifica GestoreErroriWebSocket prima che esista InviaMessaggio. */
	@Controller
	static class ControllerDiProva {

		@MessageMapping("/prova/errore")
		public void errore() {
			throw new ApplicazioneException(CodiceErrore.NON_MEMBRO, "errore di prova");
		}
	}
}
