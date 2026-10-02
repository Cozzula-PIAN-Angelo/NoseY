package it.epicode.nosey.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regole di SecurityConfig e JwtFilter (progettazione v4, sezione 14) provate con richieste HTTP
 * che passano dalla vera catena di filtri. MockMvc gira nel thread del test: con @Transactional
 * ogni test viene annullato alla fine e non lascia dati.
 */
@SpringBootTest
@Transactional
class SicurezzaHttpTest {

	@Autowired
	private WebApplicationContext context;
	@Autowired
	private TokenService tokenService;
	@Autowired
	private TokenJwtRepository tokenJwtRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;
	@Value("${app.jwt.secret}")
	private String segreto;

	private MockMvc mockMvc;

	@BeforeEach
	void prepara() {
		// Senza spring-security-test: la catena di Spring Security si aggiunge come filtro.
		mockMvc = MockMvcBuilders.webAppContextSetup(context)
				.addFilters(context.getBean("springSecurityFilterChain", Filter.class))
				.build();
	}

	// --- Endpoint pubblici ---

	@Test
	void endpointPubbliciSenzaToken() throws Exception {
		mockMvc.perform(get("/api/events")).andExpect(status().isOk());
		mockMvc.perform(get("/api/artists")).andExpect(status().isOk());
		mockMvc.perform(get("/api/stato")).andExpect(status().isOk());
	}

	@Test
	void eventoInesistentePubblico404NonUn401() throws Exception {
		mockMvc.perform(get("/api/events/{id}", UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codice").value("NON_TROVATO"));
	}

	@Test
	void partecipantiNonSonoPubblici() throws Exception {
		assertNonAutenticato(mockMvc.perform(get("/api/events/{id}/participants", UUID.randomUUID())));
	}

	@Test
	void loginPubblicoCredenzialiErrate401() throws Exception {
		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "email": "test-%s@nosey.test", "password": "sbagliata" }
								""".formatted(UUID.randomUUID())))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.codice").value("CREDENZIALI_ERRATE"));
	}

	// --- Token sugli endpoint protetti ---

	@Test
	void protettoSenzaToken401() throws Exception {
		assertNonAutenticato(mockMvc.perform(get("/api/users/me")));
	}

	@Test
	void protettoConTokenValido200() throws Exception {
		Utente mario = utente("USER");

		mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(mario)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(mario.getId().toString()));
	}

	@Test
	void protettoConTokenMalformato401() throws Exception {
		assertNonAutenticato(mockMvc.perform(get("/api/users/me")
				.header(HttpHeaders.AUTHORIZATION, "Bearer non-un-token")));
	}

	@Test
	void protettoSenzaPrefissoBearer401() throws Exception {
		String token = tokenService.emetti(utente("USER")).token();

		assertNonAutenticato(mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, token)));
	}

	@Test
	void protettoConFirmaDiUnAltroSegreto401() throws Exception {
		Utente mario = utente("USER");
		String falso = token(mario, "un-segreto-diverso-lungo-almeno-32-caratteri!!", Instant.now().plus(Duration.ofHours(1)));

		assertNonAutenticato(mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + falso)));
	}

	@Test
	void protettoConTokenScaduto401() throws Exception {
		Utente mario = utente("USER");
		String scaduto = token(mario, segreto, Instant.now().minus(Duration.ofMinutes(1)));

		assertNonAutenticato(mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + scaduto)));
	}

	@Test
	void protettoConJtiNonSalvato401() throws Exception {
		// Firma e scadenza corrette, ma il jti non e' in TOKEN_JWT: il token non e' stato emesso da noi.
		Utente mario = utente("USER");
		String token = Jwts.builder()
				.subject(mario.getId().toString())
				.id(UUID.randomUUID().toString())
				.claim("ruolo", "USER")
				.issuedAt(new Date())
				.expiration(Date.from(Instant.now().plus(Duration.ofHours(1))))
				.signWith(Keys.hmacShaKeyFor(segreto.getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256)
				.compact();

		assertNonAutenticato(mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)));
	}

	@Test
	void logoutRevocaIlTokenCorrente() throws Exception {
		String bearer = bearer(utente("USER"));

		mockMvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, bearer))
				.andExpect(status().isNoContent());

		assertNonAutenticato(mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer)));
	}

	@Test
	void tokenRevocatoNonBloccaLePaginePubbliche() throws Exception {
		Utente mario = utente("USER");
		TokenEmesso emesso = tokenService.emetti(mario);
		tokenService.revocaTutti(mario.getId());

		mockMvc.perform(get("/api/artists").header(HttpHeaders.AUTHORIZATION, "Bearer " + emesso.token()))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/events").header(HttpHeaders.AUTHORIZATION, "Bearer " + emesso.token()))
				.andExpect(status().isOk());
	}

	@Test
	void tokenMalformatoNonBloccaLePaginePubbliche() throws Exception {
		mockMvc.perform(get("/api/artists").header(HttpHeaders.AUTHORIZATION, "Bearer non-un-token"))
				.andExpect(status().isOk());
	}

	@Test
	void passwordErrataNelCambioPassword400NonUn401() throws Exception {
		// Un 401 farebbe fare logout al frontend: una password sbagliata dentro un'azione e' 400.
		Utente mario = utente("USER");
		mario.setPasswordHash(passwordEncoder.encode("Password-di-prova1"));
		String bearer = bearer(mario);

		mockMvc.perform(post("/api/users/me/password")
						.header(HttpHeaders.AUTHORIZATION, bearer)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{ \"passwordAttuale\": \"Password-sbagliata\", \"nuovaPassword\": \"Nuova-password1\" }"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codice").value("PASSWORD_ERRATA"));

		mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer))
				.andExpect(status().isOk());
	}

	// --- Ruoli ---

	@Test
	void adminSenzaToken401() throws Exception {
		assertNonAutenticato(mockMvc.perform(get("/api/admin/users")));
	}

	@Test
	void adminConRuoloUser403() throws Exception {
		assertAccessoNegato(mockMvc.perform(get("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearer(utente("USER")))));
	}

	@Test
	void adminConRuoloAdmin200() throws Exception {
		mockMvc.perform(get("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearer(utente("ADMIN"))))
				.andExpect(status().isOk());
	}

	@Test
	void adminConRuoloSuperadmin200PerLaGerarchia() throws Exception {
		mockMvc.perform(get("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearer(utente("SUPERADMIN"))))
				.andExpect(status().isOk());
	}

	@Test
	void superadminConRuoloAdmin403() throws Exception {
		assertAccessoNegato(cambiaRuoloDiUnInesistente(utente("ADMIN")));
	}

	@Test
	void superadminConRuoloUser403() throws Exception {
		assertAccessoNegato(cambiaRuoloDiUnInesistente(utente("USER")));
	}

	@Test
	void superadminConRuoloSuperadminPassaLaSicurezza() throws Exception {
		// Supera i filtri e arriva al service: l'utente non esiste, quindi 404 e non 401/403.
		cambiaRuoloDiUnInesistente(utente("SUPERADMIN"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codice").value("NON_TROVATO"));
	}

	@Test
	void ruoloCambiatoRevocaIlTokenConIlRuoloVecchio() throws Exception {
		// Il ruolo e' scritto nel token: dopo una retrocessione il vecchio token ADMIN non deve piu' valere.
		Utente superadmin = utente("SUPERADMIN");
		Utente anna = utente("ADMIN");
		String bearerAnna = bearer(anna);

		mockMvc.perform(patch("/api/superadmin/users/{id}/role", anna.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(superadmin))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{ \"ruolo\": \"USER\" }"))
				.andExpect(status().isOk());

		assertNonAutenticato(mockMvc.perform(get("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearerAnna)));
	}

	// --- Supporto ---

	private ResultActions cambiaRuoloDiUnInesistente(Utente chiChiede) throws Exception {
		return mockMvc.perform(patch("/api/superadmin/users/{id}/role", UUID.randomUUID())
				.header(HttpHeaders.AUTHORIZATION, bearer(chiChiede))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"ruolo\": \"ADMIN\" }"));
	}

	private void assertNonAutenticato(ResultActions risposta) throws Exception {
		risposta.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.codice").value("NON_AUTENTICATO"));
	}

	private void assertAccessoNegato(ResultActions risposta) throws Exception {
		risposta.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403))
				.andExpect(jsonPath("$.codice").value("ACCESSO_NEGATO"));
	}

	private String bearer(Utente utente) {
		return "Bearer " + tokenService.emetti(utente).token();
	}

	/**
	 * Token firmato a mano con il jti salvato in TOKEN_JWT, come farebbe TokenService.emetti(),
	 * ma con il segreto e la scadenza scelti dal test.
	 */
	private String token(Utente utente, String segretoFirma, Instant scadenza) {
		Instant emessoIl = scadenza.minus(Duration.ofHours(2)).truncatedTo(ChronoUnit.SECONDS);
		UUID jti = UUID.randomUUID();
		TokenJwt riga = new TokenJwt();
		riga.setUtente(utente);
		riga.setJti(jti);
		riga.setScadenza(scadenza.truncatedTo(ChronoUnit.SECONDS));
		riga.setCreatoIl(emessoIl);
		tokenJwtRepository.save(riga);

		return Jwts.builder()
				.subject(utente.getId().toString())
				.id(jti.toString())
				.claim("ruolo", utente.getRuolo().getNome())
				.issuedAt(Date.from(emessoIl))
				.expiration(Date.from(scadenza))
				.signWith(Keys.hmacShaKeyFor(segretoFirma.getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256)
				.compact();
	}

	private Utente utente(String ruolo) {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome(ruolo).orElseThrow());
		utente.setEmail("test-" + UUID.randomUUID() + "@nosey.test");
		utente.setPasswordHash("non-usata");
		utente.setNome("Prova");
		utente.setCognome(ruolo);
		utente.setVerificato(true);
		utente.setCreatoIl(Instant.now());
		return utenteRepository.save(utente);
	}
}
