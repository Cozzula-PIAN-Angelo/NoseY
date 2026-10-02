package it.epicode.nosey.auth;

import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Simulazione di un attacco CSRF (Cross-Site Request Forgery) contro SecurityConfig e JwtFilter
 * (progettazione v4, sezione 14). Modello classico del CSRF: il browser della vittima, loggata sul
 * sito vero, visita una pagina ostile che manda una richiesta allo stesso dominio; il browser allega
 * da solo le credenziali (di norma un cookie di sessione) e il server, non potendo distinguere
 * l'origine, esegue l'azione come se l'avesse chiesta la vittima.
 *
 * Qui si simula esattamente quella richiesta forgiata, cosi' com'è: nessun header Authorization
 * (un <form> HTML ostile non puo' impostarlo), un header Origin di un sito esterno, ed effetti
 * verificati sul database, non solo sul codice di stato.
 */
@SpringBootTest
@Transactional
class AttaccoCsrfTest {

	// Origine di un sito ostile, diversa da quelle ammesse in app.cors.allowed-origins (application.yml).
	private static final String ORIGINE_OSTILE = "https://evil-attacker.test";

	@Autowired
	private WebApplicationContext context;
	@Autowired
	private TokenService tokenService;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;

	private MockMvc mockMvc;

	@BeforeEach
	void prepara() {
		mockMvc = MockMvcBuilders.webAppContextSetup(context)
				.addFilters(context.getBean("springSecurityFilterChain", Filter.class))
				.build();
	}

	/**
	 * Il tentativo vero e proprio, prima difesa: un <form> ostile ospitato su un altro dominio che
	 * manda un POST /api/events, come se la vittima (gia' loggata nell'app vera, in un'altra scheda)
	 * lo mandasse senza saperlo. Il browser manda sempre l'header Origin su una richiesta cross-site:
	 * qui emerge che Spring la respinge gia' a livello CORS (403, corpo testuale "Invalid CORS
	 * request"), PRIMA ancora di arrivare al controllo di autenticazione - una sorpresa rispetto
	 * a quanto mi aspettavo (un 401 "non autenticato"), ma una difesa in piu', non in meno.
	 */
	@Test
	void formOstileConOriginEsternoBloccatoDalCors() throws Exception {
		long eventiPrimaDellAttacco = eventoRepository.count();

		mockMvc.perform(post("/api/events")
						.header(HttpHeaders.ORIGIN, ORIGINE_OSTILE)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "titolo": "Evento creato dall'attacco CSRF",
								  "dataEvento": "%s",
								  "dataFine": "%s",
								  "lat": 45.07,
								  "lng": 7.69
								}
								""".formatted(
								Instant.now().plus(Duration.ofDays(10)),
								Instant.now().plus(Duration.ofDays(11)))))
				.andExpect(status().isForbidden())
				.andExpect(content().string("Invalid CORS request"));

		// La prova che conta davvero non e' solo il codice HTTP: niente deve essere stato scritto.
		assertThat(eventoRepository.count()).isEqualTo(eventiPrimaDellAttacco);
	}

	/**
	 * Seconda difesa, indipendente dalla prima: anche togliendo l'header Origin (come potrebbe
	 * fare uno strumento che non e' un vero browser, o se il CORS fosse configurato male), la
	 * richiesta resta SENZA l'header Authorization - quello che un <form> HTML non puo' mai
	 * impostare da solo - e viene fermata dall'autenticazione, non dal CORS.
	 */
	@Test
	void formOstileSenzaOriginNeAuthorization401() throws Exception {
		long eventiPrimaDellAttacco = eventoRepository.count();

		mockMvc.perform(post("/api/events")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "titolo": "Evento creato dall'attacco CSRF",
								  "dataEvento": "%s",
								  "dataFine": "%s",
								  "lat": 45.07,
								  "lng": 7.69
								}
								""".formatted(
								Instant.now().plus(Duration.ofDays(10)),
								Instant.now().plus(Duration.ofDays(11)))))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.codice").value("NON_AUTENTICATO"));

		assertThat(eventoRepository.count()).isEqualTo(eventiPrimaDellAttacco);
	}

	/**
	 * Terza difesa: anche un Cookie qualsiasi (quello che un'app basata su sessione userebbe, e
	 * che il browser allegherebbe da solo su una richiesta cross-site) viene ignorato - l'unica
	 * credenziale che conta per JwtFilter e' l'header Authorization, mai un cookie.
	 */
	@Test
	void cookieDiSessioneFinteIgnoratoServeSoloAuthorization() throws Exception {
		mockMvc.perform(post("/api/events")
						.header(HttpHeaders.COOKIE, "JSESSIONID=finto-non-serve-a-niente; token=rubato-via-cookie")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "titolo": "x", "dataEvento": "%s", "dataFine": "%s", "lat": 0, "lng": 0 }
								""".formatted(
								Instant.now().plus(Duration.ofDays(10)),
								Instant.now().plus(Duration.ofDays(11)))))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.codice").value("NON_AUTENTICATO"));
	}

	/**
	 * Login: la risposta non deve MAI impostare un cookie. E' la base del punto precedente -
	 * se il login mettesse un Set-Cookie, un form ostile potrebbe sfruttarlo senza che il browser
	 * chieda conferma. Prova end-to-end, non solo lettura del codice sorgente.
	 */
	@Test
	void loginNonImpostaMaiUnCookie() throws Exception {
		Utente utente = utente("USER", "csrf-login-" + UUID.randomUUID() + "@nosey.test", "Password123!");

		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "email": "%s", "password": "Password123!" }
								""".formatted(utente.getEmail())))
				.andExpect(status().isOk())
				.andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
	}

	/**
	 * Confronto: con un token valido (quello che SOLO il JavaScript della vera app puo' leggere
	 * dal suo storage e mettere nell'header, mai un <form> o un cookie) l'azione riesce.
	 * Dimostra che il blocco sopra non e' un bug generico, e' specifico alla richiesta forgiata.
	 */
	@Test
	void conAuthorizationValidoLazioneRiesceDavvero() throws Exception {
		Utente mario = utente("USER", "csrf-vittima-" + UUID.randomUUID() + "@nosey.test", "Password123!");
		String bearer = "Bearer " + tokenService.emetti(mario).token();
		long eventiPrima = eventoRepository.count();

		mockMvc.perform(post("/api/events")
						.header(HttpHeaders.AUTHORIZATION, bearer)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "titolo": "Evento legittimo",
								  "dataEvento": "%s",
								  "dataFine": "%s",
								  "lat": 45.07,
								  "lng": 7.69
								}
								""".formatted(
								Instant.now().plus(Duration.ofDays(10)),
								Instant.now().plus(Duration.ofDays(11)))))
				.andExpect(status().isCreated());

		assertThat(eventoRepository.count()).isEqualTo(eventiPrima + 1);
		Evento creato = eventoRepository.findAll().stream()
				.filter(e -> e.getTitolo().equals("Evento legittimo")).findFirst().orElseThrow();
		assertThat(creato.getProprietario().getId()).isEqualTo(mario.getId());
	}

	private Utente utente(String ruolo, String email, String password) {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome(ruolo).orElseThrow());
		utente.setEmail(email);
		utente.setPasswordHash(passwordEncoder.encode(password));
		utente.setNome("Prova");
		utente.setCognome("CSRF");
		utente.setVerificato(true);
		utente.setCreatoIl(Instant.now());
		return utenteRepository.save(utente);
	}
}
