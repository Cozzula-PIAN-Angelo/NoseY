package it.epicode.nosey.user;

import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * CambioPassword (progettazione v4, sezione 2): logout dalle altre sessioni, il token
 * corrente resta valido. Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class CambioPasswordTest {

	private static final String PASSWORD = "Password-di-prova1";
	private static final String NUOVA = "Nuova-password1";

	@Autowired
	private UtenteService utenteService;
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

	private Utente mario;
	private String tokenCorrente;
	private String altroToken;
	private UtenteAutenticato autenticato;

	@BeforeEach
	void prepara() {
		mario = utente();
		tokenCorrente = tokenService.emetti(mario).token();
		altroToken = tokenService.emetti(mario).token();
		autenticato = tokenService.verifica(tokenCorrente).orElseThrow();
	}

	@Test
	void corretto_nuovaPasswordSalvata() {
		cambia(PASSWORD, NUOVA);

		String hash = ricarica(mario).getPasswordHash();
		assertThat(passwordEncoder.matches(NUOVA, hash)).isTrue();
		assertThat(passwordEncoder.matches(PASSWORD, hash)).isFalse();
	}

	@Test
	void corretto_tokenCorrenteValidoGliAltriRevocati() {
		cambia(PASSWORD, NUOVA);

		assertThat(tokenService.verifica(tokenCorrente)).isPresent();
		assertThat(tokenService.verifica(altroToken)).isEmpty();
	}

	@Test
	void corretto_iTokenDegliAltriUtentiRestano() {
		String tokenLuigi = tokenService.emetti(utente()).token();

		cambia(PASSWORD, NUOVA);

		assertThat(tokenService.verifica(tokenLuigi)).isPresent();
	}

	@Test
	void passwordAttualeErrata_passwordErrataSenzaModifiche() {
		assertErrore(CodiceErrore.PASSWORD_ERRATA, () -> cambia("Password-sbagliata", NUOVA));

		assertThat(passwordEncoder.matches(PASSWORD, ricarica(mario).getPasswordHash())).isTrue();
		assertThat(tokenService.verifica(altroToken)).isPresent();
	}

	@Test
	void passwordAttualeOltre72Byte_comeUnaErrata() {
		// 40 caratteri accentati = 80 byte in UTF-8, sotto il @Size(max = 72) del DTO.
		assertErrore(CodiceErrore.PASSWORD_ERRATA, () -> cambia("è".repeat(40), NUOVA));
	}

	@Test
	void nuovaUgualeAllAttuale_passwordUgualeSenzaRevoche() {
		assertErrore(CodiceErrore.PASSWORD_UGUALE, () -> cambia(PASSWORD, PASSWORD));

		assertThat(tokenService.verifica(altroToken)).isPresent();
	}

	// --- Supporto ---

	private void cambia(String attuale, String nuova) {
		utenteService.cambiaPassword(autenticato, new CambioPasswordRequest(attuale, nuova));
	}

	private void assertErrore(CodiceErrore atteso, Executable azione) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, azione);
		assertThat(ex.getCodiceErrore()).isEqualTo(atteso);
	}

	private Utente ricarica(Utente utente) {
		entityManager.flush();
		entityManager.refresh(utente);
		return utente;
	}

	private Utente utente() {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome("USER").orElseThrow());
		utente.setEmail("test-" + UUID.randomUUID() + "@nosey.test");
		utente.setPasswordHash(passwordEncoder.encode(PASSWORD));
		utente.setNome("Prova");
		utente.setCognome("Password");
		utente.setVerificato(true);
		utente.setCreatoIl(Instant.now());
		return utenteRepository.saveAndFlush(utente);
	}
}
