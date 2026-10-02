package it.epicode.nosey.auth;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.ScopoCodice;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Registrazione, verifica, login e reset della password (progettazione v4, sezione 1):
 * ordine dei controlli, limiti di frequenza e tentativi sui codici.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 * Le email partono solo dopo il commit, quindi qui non ne parte nessuna.
 */
@SpringBootTest
@Transactional
class AuthServiceTest {

	private static final String PASSWORD = "Password-di-prova1";
	private static final String CODICE = "123456";

	@Autowired
	private AuthService authService;
	@Autowired
	private TokenService tokenService;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;
	@Autowired
	private EntityManager entityManager;

	// --- Login ---

	@Test
	void login_corretto_tokenValidoConIlRuolo() {
		Utente mario = utente(true, StatoUtente.ATTIVO);

		LoginResponse risposta = login(mario.getEmail(), PASSWORD);

		assertThat(risposta.utente().id()).isEqualTo(mario.getId());
		assertThat(tokenService.verifica(risposta.token()))
				.hasValueSatisfying(autenticato -> {
					assertThat(autenticato.id()).isEqualTo(mario.getId());
					assertThat(autenticato.ruolo()).isEqualTo("USER");
				});
	}

	@Test
	void login_emailConMaiuscoleESpazi_normalizzata() {
		Utente mario = utente(true, StatoUtente.ATTIVO);

		assertThat(login("  " + mario.getEmail().toUpperCase() + " ", PASSWORD).utente().id()).isEqualTo(mario.getId());
	}

	@Test
	void login_passwordErrata_credenzialiErrate() {
		Utente mario = utente(true, StatoUtente.ATTIVO);

		assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(mario.getEmail(), "Password-sbagliata"));
	}

	@Test
	void login_utenteInesistente_credenzialiErrate() {
		assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(emailNuova(), PASSWORD));
	}

	@Test
	void login_anonimizzato_credenzialiErrateAncheConLaPasswordGiusta() {
		Utente anonimo = utente(true, StatoUtente.ANONIMIZZATO);

		assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(anonimo.getEmail(), PASSWORD));
	}

	@Test
	void login_passwordOltre72Byte_credenzialiErrate() {
		Utente mario = utente(true, StatoUtente.ATTIVO);

		// 40 caratteri accentati = 80 byte in UTF-8, sotto il @Size(max = 72) del DTO.
		assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(mario.getEmail(), "è".repeat(40)));
	}

	@Test
	void login_nonVerificato_403SoloConLaPasswordGiusta() {
		Utente mario = utente(false, StatoUtente.ATTIVO);

		// Con la password sbagliata non si scopre che l'email esiste.
		assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(mario.getEmail(), "Password-sbagliata"));
		assertErrore(CodiceErrore.EMAIL_NON_VERIFICATA, () -> login(mario.getEmail(), PASSWORD));
	}

	@Test
	void login_sospeso_403SoloConLaPasswordGiusta() {
		Utente mario = utente(true, StatoUtente.SOSPESO);

		assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(mario.getEmail(), "Password-sbagliata"));
		assertErrore(CodiceErrore.ACCOUNT_SOSPESO, () -> login(mario.getEmail(), PASSWORD));
	}

	@Test
	void login_dieciFalliti_poiTroppeRichiesteAncheConLaPasswordGiusta() {
		Utente mario = utente(true, StatoUtente.ATTIVO);

		for (int i = 0; i < 10; i++) {
			assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(mario.getEmail(), "Password-sbagliata"));
		}

		assertErrore(CodiceErrore.TROPPE_RICHIESTE, () -> login(mario.getEmail(), PASSWORD));
	}

	@Test
	void login_limitePerEmail_nonToccaGliAltri() {
		Utente mario = utente(true, StatoUtente.ATTIVO);
		Utente luigi = utente(true, StatoUtente.ATTIVO);
		for (int i = 0; i < 10; i++) {
			assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(mario.getEmail(), "Password-sbagliata"));
		}

		assertThat(login(luigi.getEmail(), PASSWORD).utente().id()).isEqualTo(luigi.getId());
	}

	@Test
	void login_riuscito_azzeraITentativiFalliti() {
		Utente mario = utente(true, StatoUtente.ATTIVO);

		for (int giro = 0; giro < 2; giro++) {
			for (int i = 0; i < 9; i++) {
				assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(mario.getEmail(), "Password-sbagliata"));
			}
			// Senza azzeramento, al secondo giro i falliti sarebbero 18: 429.
			login(mario.getEmail(), PASSWORD);
		}
	}

	@Test
	void login_i403NonContanoComeTentativiFalliti() {
		Utente mario = utente(false, StatoUtente.ATTIVO);

		for (int i = 0; i < 11; i++) {
			assertErrore(CodiceErrore.EMAIL_NON_VERIFICATA, () -> login(mario.getEmail(), PASSWORD));
		}
	}

	// --- Registrazione ---

	@Test
	void registra_emailNuova_userAttivoNonVerificatoConCodice() {
		String email = emailNuova();

		RegisterResponse risposta = authService.registra(registrazione(email, "Mario"));

		Utente salvato = utenteRepository.findById(risposta.id()).orElseThrow();
		assertThat(risposta.email()).isEqualTo(email);
		assertThat(salvato.getRuolo().getNome()).isEqualTo("USER");
		assertThat(salvato.getStato()).isEqualTo(StatoUtente.ATTIVO);
		assertThat(salvato.isVerificato()).isFalse();
		assertThat(salvato.getCodice()).matches("\\d{6}");
		assertThat(salvato.getCodiceScopo()).isEqualTo(ScopoCodice.VERIFICA_EMAIL);
		assertThat(salvato.getPasswordHash()).isNotEqualTo(PASSWORD);
		assertThat(passwordEncoder.matches(PASSWORD, salvato.getPasswordHash())).isTrue();
	}

	@Test
	void registra_emailNonVerificata_laNuovaRegistrazioneSovrascrive() {
		Utente vecchio = utente(false, StatoUtente.ATTIVO);
		conCodice(vecchio, ScopoCodice.VERIFICA_EMAIL, Instant.now().minus(Duration.ofMinutes(2)));
		String vecchioCodice = vecchio.getCodice();

		RegisterResponse risposta = authService.registra(new RegisterRequest(
				vecchio.getEmail(), "Altra-password1", "Luigi", "Verdi", null, LocalDate.of(1990, 1, 1)));

		assertThat(risposta.id()).isEqualTo(vecchio.getId());
		Utente salvato = utenteRepository.findById(vecchio.getId()).orElseThrow();
		assertThat(salvato.getNome()).isEqualTo("Luigi");
		assertThat(passwordEncoder.matches("Altra-password1", salvato.getPasswordHash())).isTrue();
		assertThat(salvato.getCodice()).isNotEqualTo(vecchioCodice);
	}

	@Test
	void registra_emailVerificata_emailGiaRegistrata() {
		Utente mario = utente(true, StatoUtente.ATTIVO);

		assertErrore(CodiceErrore.EMAIL_GIA_REGISTRATA, () -> authService.registra(registrazione(mario.getEmail(), "Ladro")));
		assertThat(utenteRepository.findById(mario.getId()).orElseThrow().getNome()).isEqualTo("Prova");
	}

	@Test
	void registra_nonVerificataMaSospesa_emailGiaRegistrata() {
		Utente mario = utente(false, StatoUtente.SOSPESO);

		assertErrore(CodiceErrore.EMAIL_GIA_REGISTRATA, () -> authService.registra(registrazione(mario.getEmail(), "Mario")));
	}

	@Test
	void registra_secondoInvioEntro60Secondi_troppeRichieste() {
		String email = emailNuova();
		authService.registra(registrazione(email, "Mario"));

		assertErrore(CodiceErrore.TROPPE_RICHIESTE, () -> authService.registra(registrazione(email, "Mario")));
	}

	@Test
	void registra_cinqueInviiIn24Ore_troppeRichieste() {
		Utente mario = utente(false, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now().minus(Duration.ofMinutes(5)));
		mario.setInviiCodice(5);
		mario.setInviiCodiceDal(Instant.now().minus(Duration.ofHours(23)));
		utenteRepository.saveAndFlush(mario);

		assertErrore(CodiceErrore.TROPPE_RICHIESTE, () -> authService.registra(registrazione(mario.getEmail(), "Mario")));
	}

	@Test
	void registra_finestraDi24OreTrascorsa_ripartireDaUno() {
		Utente mario = utente(false, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now().minus(Duration.ofHours(2)));
		mario.setInviiCodice(5);
		mario.setInviiCodiceDal(Instant.now().minus(Duration.ofHours(25)));
		utenteRepository.saveAndFlush(mario);

		authService.registra(registrazione(mario.getEmail(), "Mario"));

		assertThat(utenteRepository.findById(mario.getId()).orElseThrow().getInviiCodice()).isEqualTo(1);
	}

	// --- Verifica dell'email ---

	@Test
	void verifica_corretta_verificatoCodiceCancellatoETokenValido() {
		Utente mario = utente(false, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now());

		LoginResponse risposta = verifica(mario, CODICE, PASSWORD);

		Utente salvato = ricarica(mario);
		assertThat(salvato.isVerificato()).isTrue();
		assertThat(salvato.getCodice()).isNull();
		assertThat(salvato.getCodiceScopo()).isNull();
		assertThat(salvato.getCodiceTentativi()).isZero();
		assertThat(tokenService.verifica(risposta.token())).isPresent();
	}

	@Test
	void verifica_accountInesistenteOAnonimizzato_codiceNonValido() {
		Utente anonimo = utente(false, StatoUtente.ANONIMIZZATO);
		conCodice(anonimo, ScopoCodice.VERIFICA_EMAIL, Instant.now());

		assertErrore(CodiceErrore.CODICE_NON_VALIDO,
				() -> authService.verifica(new VerifyRequest(emailNuova(), CODICE, PASSWORD)));
		assertErrore(CodiceErrore.CODICE_NON_VALIDO, () -> verifica(anonimo, CODICE, PASSWORD));
	}

	@Test
	void verifica_giaVerificato_conflitto() {
		Utente mario = utente(true, StatoUtente.ATTIVO);

		assertErrore(CodiceErrore.GIA_VERIFICATO, () -> verifica(mario, CODICE, PASSWORD));
	}

	@Test
	void verifica_sospeso_accountSospeso() {
		Utente mario = utente(false, StatoUtente.SOSPESO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now());

		assertErrore(CodiceErrore.ACCOUNT_SOSPESO, () -> verifica(mario, CODICE, PASSWORD));
	}

	@Test
	void verifica_codiceOltre15Minuti_scaduto() {
		Utente mario = utente(false, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now().minus(Duration.ofMinutes(16)));

		assertErrore(CodiceErrore.CODICE_SCADUTO, () -> verifica(mario, CODICE, PASSWORD));
	}

	@Test
	void verifica_codiceDiResetPassword_nonVale() {
		Utente mario = utente(false, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.RESET_PASSWORD, Instant.now());

		assertErrore(CodiceErrore.CODICE_SCADUTO, () -> verifica(mario, CODICE, PASSWORD));
		assertThat(ricarica(mario).isVerificato()).isFalse();
	}

	@Test
	void verifica_codiceSbagliato_tentativoConsumatoESalvato() {
		Utente mario = utente(false, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now());

		assertErrore(CodiceErrore.CODICE_NON_VALIDO, () -> verifica(mario, "654321", PASSWORD));

		assertThat(ricarica(mario).getCodiceTentativi()).isEqualTo(1);
	}

	@Test
	void verifica_cinqueTentativiSbagliati_poiScadutoAncheConIlCodiceGiusto() {
		Utente mario = utente(false, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now());

		for (int i = 0; i < 5; i++) {
			assertErrore(CodiceErrore.CODICE_NON_VALIDO, () -> verifica(mario, "654321", PASSWORD));
		}

		assertErrore(CodiceErrore.CODICE_SCADUTO, () -> verifica(mario, CODICE, PASSWORD));
		Utente salvato = ricarica(mario);
		assertThat(salvato.getCodiceTentativi()).isEqualTo(5);
		assertThat(salvato.isVerificato()).isFalse();
	}

	@Test
	void verifica_tentativiGiaEsauriti_scaduto() {
		Utente mario = utente(false, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now());
		mario.setCodiceTentativi(5);
		utenteRepository.saveAndFlush(mario);

		assertErrore(CodiceErrore.CODICE_SCADUTO, () -> verifica(mario, CODICE, PASSWORD));
	}

	@Test
	void verifica_passwordDiversaDaQuellaDellaRegistrazione_passwordErrata() {
		Utente mario = utente(false, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now());

		assertErrore(CodiceErrore.PASSWORD_ERRATA, () -> verifica(mario, CODICE, "Password-sbagliata"));

		Utente salvato = ricarica(mario);
		assertThat(salvato.isVerificato()).isFalse();
		assertThat(salvato.getCodiceTentativi()).isEqualTo(1);
	}

	@Test
	void reinviaCodice_accountVerificato_nessunEffetto() {
		Utente mario = utente(true, StatoUtente.ATTIVO);

		authService.reinviaCodice(new EmailRequest(mario.getEmail()));
		authService.reinviaCodice(new EmailRequest(emailNuova()));

		assertThat(ricarica(mario).getCodice()).isNull();
	}

	// --- Password dimenticata e reset ---

	@Test
	void passwordDimenticata_soloPerAccountVerificatiEAttivi() {
		Utente verificato = utente(true, StatoUtente.ATTIVO);
		Utente nonVerificato = utente(false, StatoUtente.ATTIVO);
		Utente sospeso = utente(true, StatoUtente.SOSPESO);

		for (Utente utente : new Utente[] {verificato, nonVerificato, sospeso}) {
			authService.passwordDimenticata(new EmailRequest(utente.getEmail()));
		}

		assertThat(ricarica(verificato).getCodiceScopo()).isEqualTo(ScopoCodice.RESET_PASSWORD);
		assertThat(ricarica(nonVerificato).getCodice()).isNull();
		assertThat(ricarica(sospeso).getCodice()).isNull();
	}

	@Test
	void reimposta_corretto_nuovaPasswordERevocaDiTuttiIToken() {
		Utente mario = utente(true, StatoUtente.ATTIVO);
		String token1 = tokenService.emetti(mario).token();
		String token2 = tokenService.emetti(mario).token();
		conCodice(mario, ScopoCodice.RESET_PASSWORD, Instant.now());

		reimposta(mario, CODICE, "Nuova-password1");

		Utente salvato = ricarica(mario);
		assertThat(passwordEncoder.matches("Nuova-password1", salvato.getPasswordHash())).isTrue();
		assertThat(salvato.getCodice()).isNull();
		assertThat(tokenService.verifica(token1)).isEmpty();
		assertThat(tokenService.verifica(token2)).isEmpty();
		// La vecchia password non vale piu', la nuova si'.
		assertErrore(CodiceErrore.CREDENZIALI_ERRATE, () -> login(mario.getEmail(), PASSWORD));
		assertThat(login(mario.getEmail(), "Nuova-password1").utente().id()).isEqualTo(mario.getId());
	}

	@Test
	void reimposta_codiceDiVerificaEmail_codiceNonValido() {
		Utente mario = utente(true, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.VERIFICA_EMAIL, Instant.now());

		assertErrore(CodiceErrore.CODICE_NON_VALIDO, () -> reimposta(mario, CODICE, "Nuova-password1"));
	}

	@Test
	void reimposta_accountSospeso_codiceNonValido() {
		Utente mario = utente(true, StatoUtente.SOSPESO);
		conCodice(mario, ScopoCodice.RESET_PASSWORD, Instant.now());

		assertErrore(CodiceErrore.CODICE_NON_VALIDO, () -> reimposta(mario, CODICE, "Nuova-password1"));
	}

	@Test
	void reimposta_codiceOltre15Minuti_scaduto() {
		Utente mario = utente(true, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.RESET_PASSWORD, Instant.now().minus(Duration.ofMinutes(16)));

		assertErrore(CodiceErrore.CODICE_SCADUTO, () -> reimposta(mario, CODICE, "Nuova-password1"));
	}

	@Test
	void reimposta_cinqueTentativiSbagliati_poiScadutoEPasswordInvariata() {
		Utente mario = utente(true, StatoUtente.ATTIVO);
		conCodice(mario, ScopoCodice.RESET_PASSWORD, Instant.now());

		for (int i = 0; i < 5; i++) {
			assertErrore(CodiceErrore.CODICE_NON_VALIDO, () -> reimposta(mario, "654321", "Nuova-password1"));
		}

		assertErrore(CodiceErrore.CODICE_SCADUTO, () -> reimposta(mario, CODICE, "Nuova-password1"));
		assertThat(passwordEncoder.matches(PASSWORD, ricarica(mario).getPasswordHash())).isTrue();
	}

	// --- Supporto ---

	private LoginResponse login(String email, String password) {
		return authService.login(new LoginRequest(email, password));
	}

	private LoginResponse verifica(Utente utente, String codice, String password) {
		return authService.verifica(new VerifyRequest(utente.getEmail(), codice, password));
	}

	private void reimposta(Utente utente, String codice, String nuovaPassword) {
		authService.reimpostaPassword(new ReimpostaPasswordRequest(utente.getEmail(), codice, nuovaPassword));
	}

	private RegisterRequest registrazione(String email, String nome) {
		return new RegisterRequest(email, PASSWORD, nome, "Rossi", null, LocalDate.of(1990, 1, 1));
	}

	private void assertErrore(CodiceErrore atteso, Executable azione) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, azione);
		assertThat(ex.getCodiceErrore()).isEqualTo(atteso);
	}

	/**
	 * I tentativi si consumano con un UPDATE diretto sul database: l'entita' in memoria
	 * va riletta per vederli.
	 */
	private Utente ricarica(Utente utente) {
		entityManager.flush();
		entityManager.refresh(utente);
		return utente;
	}

	private void conCodice(Utente utente, ScopoCodice scopo, Instant inviatoIl) {
		utente.setCodice(CODICE);
		utente.setCodiceScopo(scopo);
		utente.setCodiceInviatoIl(inviatoIl);
		utente.setCodiceTentativi(0);
		utente.setInviiCodice(1);
		utente.setInviiCodiceDal(inviatoIl);
		utenteRepository.saveAndFlush(utente);
	}

	private String emailNuova() {
		return "test-" + UUID.randomUUID() + "@nosey.test";
	}

	private Utente utente(boolean verificato, StatoUtente stato) {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome("USER").orElseThrow());
		utente.setEmail(emailNuova());
		utente.setPasswordHash(passwordEncoder.encode(PASSWORD));
		utente.setNome("Prova");
		utente.setCognome("Auth");
		utente.setDataNascita(LocalDate.of(1990, 1, 1));
		utente.setVerificato(verificato);
		utente.setStato(stato);
		utente.setCreatoIl(Instant.now());
		return utenteRepository.saveAndFlush(utente);
	}
}
