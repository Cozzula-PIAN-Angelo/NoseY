package it.epicode.nosey.user;

import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.PaginaResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * ListaUtenti, CambiaStatoUtente e CambiaRuolo (progettazione v4, sezioni 12 e 13; decisioni D16 e 21).
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class AdminUtentiTest {

	@Autowired
	private AdminUtenteService adminUtenteService;
	@Autowired
	private TokenService tokenService;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;

	// Nel cognome di ogni utente del test: la lista vede solo loro, non il resto del database.
	private final String marcatore = "Zq" + UUID.randomUUID().toString().substring(0, 8);

	private Utente superadmin;
	private Utente admin;
	private Utente mario;

	@BeforeEach
	void prepara() {
		Instant adesso = Instant.now();
		superadmin = utente("Sara", "SUPERADMIN", adesso.minus(Duration.ofHours(3)));
		admin = utente("Anna", "ADMIN", adesso.minus(Duration.ofHours(2)));
		mario = utente("Mario", "USER", adesso.minus(Duration.ofHours(1)));
	}

	// --- ListaUtenti ---

	@Test
	void listaPerCreazioneDecrescenteESenzaDistinzioneDiMaiuscole() {
		PaginaResponse<AdminUtenteResponse> pagina = lista(marcatore.toUpperCase(), null);

		assertThat(pagina.contenuto()).extracting(AdminUtenteResponse::id)
				.containsExactly(mario.getId(), admin.getId(), superadmin.getId());
		assertThat(pagina.totaleElementi()).isEqualTo(3);
		AdminUtenteResponse primo = pagina.contenuto().getFirst();
		assertThat(primo.ruolo()).isEqualTo("USER");
		assertThat(primo.stato()).isEqualTo(StatoUtente.ATTIVO);
		assertThat(primo.verificato()).isTrue();
	}

	@Test
	void listaCercaAncheSuNomeEdEmail() {
		assertThat(lista("mario", null).contenuto()).extracting(AdminUtenteResponse::id).contains(mario.getId());
		assertThat(lista(mario.getEmail().substring(0, 20), null).contenuto())
				.extracting(AdminUtenteResponse::id).containsExactly(mario.getId());
	}

	@Test
	void listaFiltraPerStato() {
		mario.setStato(StatoUtente.SOSPESO);
		utenteRepository.saveAndFlush(mario);

		assertThat(lista(marcatore, StatoUtente.SOSPESO).contenuto())
				.extracting(AdminUtenteResponse::id).containsExactly(mario.getId());
		assertThat(lista(marcatore, StatoUtente.ATTIVO).contenuto())
				.extracting(AdminUtenteResponse::id).containsExactly(admin.getId(), superadmin.getId());
	}

	@Test
	void listaIlTrattinoBassoNonEUnJolly() {
		Utente conTrattino = utente("Luigi", "USER", Instant.now(), "a_b");
		utente("Peach", "USER", Instant.now(), "axb");

		assertThat(lista(marcatore + "a_b", null).contenuto())
				.extracting(AdminUtenteResponse::id).containsExactly(conTrattino.getId());
	}

	// --- CambiaStatoUtente ---

	@Test
	void adminCheSospendeUnAltroAdmin403() {
		Utente altroAdmin = utente("Bruno", "ADMIN", Instant.now());

		assertErrore(CodiceErrore.RUOLO_INSUFFICIENTE, () -> sospendi(altroAdmin, admin));
	}

	@Test
	void adminCheSospendeIlSuperadmin403() {
		assertErrore(CodiceErrore.RUOLO_INSUFFICIENTE, () -> sospendi(superadmin, admin));
	}

	@Test
	void adminCheSospendeSeStesso403() {
		assertErrore(CodiceErrore.RUOLO_INSUFFICIENTE, () -> sospendi(admin, admin));
	}

	@Test
	void adminSospendeUnUtenteERevocaISuoiToken() {
		String token = tokenService.emetti(mario).token();

		AdminUtenteResponse risposta = sospendi(mario, admin);

		assertThat(risposta.stato()).isEqualTo(StatoUtente.SOSPESO);
		assertThat(tokenService.verifica(token)).isEmpty();
	}

	@Test
	void superadminSospendeUnAdmin() {
		assertThat(sospendi(admin, superadmin).stato()).isEqualTo(StatoUtente.SOSPESO);
	}

	@Test
	void riattivazione() {
		sospendi(mario, admin);

		AdminUtenteResponse risposta = adminUtenteService.cambiaStato(mario.getId(),
				new CambiaStatoUtenteRequest(StatoUtente.ATTIVO), admin.getId());

		assertThat(risposta.stato()).isEqualTo(StatoUtente.ATTIVO);
	}

	@Test
	void statoAnonimizzatoNonAmmesso() {
		assertErrore(CodiceErrore.STATO_NON_AMMESSO, () -> adminUtenteService.cambiaStato(mario.getId(),
				new CambiaStatoUtenteRequest(StatoUtente.ANONIMIZZATO), admin.getId()));
	}

	@Test
	void statoDiUnUtenteInesistente404() {
		assertErrore(CodiceErrore.NON_TROVATO, () -> adminUtenteService.cambiaStato(UUID.randomUUID(),
				new CambiaStatoUtenteRequest(StatoUtente.SOSPESO), admin.getId()));
	}

	@Test
	void statoDiUnUtenteAnonimizzato409() {
		mario.setStato(StatoUtente.ANONIMIZZATO);
		utenteRepository.saveAndFlush(mario);

		assertErrore(CodiceErrore.UTENTE_ANONIMIZZATO, () -> sospendi(mario, admin));
	}

	// --- CambiaRuolo ---

	@Test
	void superadminPromuoveUnUtenteERevocaISuoiToken() {
		String token = tokenService.emetti(mario).token();

		AdminUtenteResponse risposta = cambiaRuolo(mario, "ADMIN");

		assertThat(risposta.ruolo()).isEqualTo("ADMIN");
		assertThat(tokenService.verifica(token)).isEmpty();
	}

	@Test
	void superadminRetrocedeUnAdmin() {
		assertThat(cambiaRuolo(admin, "USER").ruolo()).isEqualTo("USER");
	}

	@Test
	void stessoRuoloNonRevocaIToken() {
		String token = tokenService.emetti(mario).token();

		assertThat(cambiaRuolo(mario, "USER").ruolo()).isEqualTo("USER");
		assertThat(tokenService.verifica(token)).isPresent();
	}

	@Test
	void ruoloSuperadminNonAmmesso() {
		assertErrore(CodiceErrore.RUOLO_NON_AMMESSO, () -> cambiaRuolo(mario, "SUPERADMIN"));
	}

	@Test
	void ruoloInesistente400() {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, () -> cambiaRuolo(mario, "PIPPO"));

		assertThat(ex.getCodiceErrore()).isEqualTo(CodiceErrore.VALIDAZIONE);
		assertThat(ex.getCampi()).containsKey("ruolo");
	}

	@Test
	void ruoloDiSeStesso403() {
		assertErrore(CodiceErrore.RUOLO_INSUFFICIENTE, () -> cambiaRuolo(superadmin, "USER"));
	}

	@Test
	void ruoloDiUnAltroSuperadmin403() {
		Utente altroSuperadmin = utente("Carla", "SUPERADMIN", Instant.now());

		assertErrore(CodiceErrore.RUOLO_INSUFFICIENTE, () -> cambiaRuolo(altroSuperadmin, "USER"));
	}

	@Test
	void ruoloDiUnUtenteInesistente404() {
		assertErrore(CodiceErrore.NON_TROVATO, () -> adminUtenteService.cambiaRuolo(UUID.randomUUID(),
				new CambiaRuoloRequest("ADMIN"), superadmin.getId()));
	}

	@Test
	void ruoloDiUnUtenteNonVerificato409() {
		mario.setVerificato(false);
		utenteRepository.saveAndFlush(mario);

		assertErrore(CodiceErrore.UTENTE_NON_VERIFICATO, () -> cambiaRuolo(mario, "ADMIN"));
	}

	@Test
	void ruoloDiUnUtenteSospeso409() {
		mario.setStato(StatoUtente.SOSPESO);
		utenteRepository.saveAndFlush(mario);

		assertErrore(CodiceErrore.UTENTE_NON_ATTIVO, () -> cambiaRuolo(mario, "ADMIN"));
	}

	// --- Supporto ---

	private PaginaResponse<AdminUtenteResponse> lista(String search, StatoUtente stato) {
		return adminUtenteService.lista(search, stato, 0, 20);
	}

	private AdminUtenteResponse sospendi(Utente bersaglio, Utente chiChiede) {
		return adminUtenteService.cambiaStato(bersaglio.getId(),
				new CambiaStatoUtenteRequest(StatoUtente.SOSPESO), chiChiede.getId());
	}

	private AdminUtenteResponse cambiaRuolo(Utente bersaglio, String ruolo) {
		return adminUtenteService.cambiaRuolo(bersaglio.getId(), new CambiaRuoloRequest(ruolo), superadmin.getId());
	}

	private void assertErrore(CodiceErrore atteso, Executable azione) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, azione);
		assertThat(ex.getCodiceErrore()).isEqualTo(atteso);
	}

	private Utente utente(String nome, String ruolo, Instant creatoIl) {
		return utente(nome, ruolo, creatoIl, "");
	}

	private Utente utente(String nome, String ruolo, Instant creatoIl, String suffissoCognome) {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome(ruolo).orElseThrow());
		utente.setEmail("test-" + UUID.randomUUID() + "@nosey.test");
		utente.setPasswordHash("non-usata");
		utente.setNome(nome);
		utente.setCognome(marcatore + suffissoCognome);
		utente.setVerificato(true);
		utente.setCreatoIl(creatoIl);
		return utenteRepository.save(utente);
	}
}
