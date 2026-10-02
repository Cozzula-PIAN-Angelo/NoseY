package it.epicode.nosey.user;

import it.epicode.nosey.auth.AuthService;
import it.epicode.nosey.auth.LoginRequest;
import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.auth.UtenteAutenticato;
import it.epicode.nosey.chat.Chat;
import it.epicode.nosey.chat.ChatRepository;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.event.StatoEventoDb;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.friendship.AmiciziaRepository;
import it.epicode.nosey.friendship.StatoAmicizia;
import it.epicode.nosey.notification.NotificaAmicizia;
import it.epicode.nosey.notification.NotificaAmiciziaRepository;
import it.epicode.nosey.notification.NotificaChat;
import it.epicode.nosey.notification.NotificaChatRepository;
import it.epicode.nosey.notification.NotificaEvento;
import it.epicode.nosey.notification.NotificaEventoRepository;
import it.epicode.nosey.notification.TipoNotificaAmicizia;
import it.epicode.nosey.notification.TipoNotificaEvento;
import it.epicode.nosey.ticket.Partecipante;
import it.epicode.nosey.ticket.PartecipanteRepository;
import org.junit.jupiter.api.BeforeEach;
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
 * Anonimizzazione (progettazione v4, sezione 2; decisione 13). Le regole di dettaglio sugli eventi
 * (in corso, conclusi, annullati) sono in AnonimizzazioneEventiTest.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class AnonimizzazioneTest {

	private static final String PASSWORD = "password-di-anna";

	@Autowired
	private AnonimizzazioneService anonimizzazioneService;
	@Autowired
	private AuthService authService;
	@Autowired
	private TokenService tokenService;
	@Autowired
	private PasswordEncoder passwordEncoder;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private PartecipanteRepository partecipanteRepository;
	@Autowired
	private AmiciziaRepository amiciziaRepository;
	@Autowired
	private ChatRepository chatRepository;
	@Autowired
	private NotificaEventoRepository notificaEventoRepository;
	@Autowired
	private NotificaAmiciziaRepository notificaAmiciziaRepository;
	@Autowired
	private NotificaChatRepository notificaChatRepository;

	private Utente anna;
	private Utente mario;
	private String emailOriginale;

	@BeforeEach
	void prepara() {
		anna = utente("Anna", "USER");
		anna.setIndirizzo("Via Roma 1");
		anna.setDataNascita(LocalDate.of(1995, 5, 10));
		anna.setImmagineProfilo(new byte[] {1, 2, 3});
		anna.setImmagineProfiloContentType("image/png");
		utenteRepository.saveAndFlush(anna);
		emailOriginale = anna.getEmail();
		mario = utente("Mario", "USER");
	}

	// --- Controlli ---

	@Test
	void passwordErrata400ESenzaModifiche() {
		assertErrore(CodiceErrore.PASSWORD_ERRATA, () -> anonimizza(anna, "sbagliata"));

		assertThat(ricarica(anna).getStato()).isEqualTo(StatoUtente.ATTIVO);
		assertThat(ricarica(anna).getEmail()).isEqualTo(emailOriginale);
	}

	@Test
	void passwordOltre72ByteComeUnaErrata() {
		assertErrore(CodiceErrore.PASSWORD_ERRATA, () -> anonimizza(anna, "è".repeat(40)));
	}

	@Test
	void unicoSuperadminAttivo409() {
		sospendiAltriSuperadmin();
		Utente superadmin = utente("Sara", "SUPERADMIN");

		assertErrore(CodiceErrore.ULTIMO_SUPERADMIN, () -> anonimizza(superadmin, PASSWORD));
		assertThat(ricarica(superadmin).getStato()).isEqualTo(StatoUtente.ATTIVO);
	}

	@Test
	void unSuperadminSospesoNonConta() {
		sospendiAltriSuperadmin();
		Utente sospeso = utente("Sofia", "SUPERADMIN");
		sospeso.setStato(StatoUtente.SOSPESO);
		utenteRepository.saveAndFlush(sospeso);
		Utente superadmin = utente("Sara", "SUPERADMIN");

		assertErrore(CodiceErrore.ULTIMO_SUPERADMIN, () -> anonimizza(superadmin, PASSWORD));
	}

	@Test
	void conUnAltroSuperadminAttivoSiPuo() {
		sospendiAltriSuperadmin();
		utente("Sofia", "SUPERADMIN");
		Utente superadmin = utente("Sara", "SUPERADMIN");

		anonimizza(superadmin, PASSWORD);

		Utente anonimo = ricarica(superadmin);
		assertThat(anonimo.getStato()).isEqualTo(StatoUtente.ANONIMIZZATO);
		assertThat(anonimo.getRuolo().getNome()).isEqualTo("USER");
	}

	// --- Dati personali e account ---

	@Test
	void datiPersonaliCancellatiEAccountChiuso() {
		anna.setCodice("123456");
		anna.setCodiceScopo(ScopoCodice.VERIFICA_EMAIL);
		anna.setCodiceInviatoIl(Instant.now());
		utenteRepository.saveAndFlush(anna);
		String token = tokenService.emetti(anna).token();

		anonimizza(anna, PASSWORD);

		Utente anonimo = ricarica(anna);
		assertThat(anonimo.getEmail()).isEqualTo("anon-" + anna.getId() + "@nosey.invalid");
		assertThat(anonimo.getNome()).isEqualTo("Utente");
		assertThat(anonimo.getCognome()).isEqualTo("anonimo");
		assertThat(anonimo.getIndirizzo()).isNull();
		assertThat(anonimo.getDataNascita()).isNull();
		assertThat(anonimo.getImmagineProfiloVersione()).isNull();
		assertThat(anonimo.getImmagineProfiloContentType()).isNull();
		assertThat(anonimo.getCodice()).isNull();
		assertThat(anonimo.getCodiceScopo()).isNull();
		assertThat(passwordEncoder.matches(PASSWORD, anonimo.getPasswordHash())).isFalse();
		assertThat(anonimo.getStato()).isEqualTo(StatoUtente.ANONIMIZZATO);
		assertThat(anonimo.getRuolo().getNome()).isEqualTo("USER");
		assertThat(tokenService.verifica(token)).isEmpty();
	}

	@Test
	void nonPuoPiuEntrare() {
		anonimizza(anna, PASSWORD);

		assertErrore(CodiceErrore.CREDENZIALI_ERRATE,
				() -> authService.login(new LoginRequest(emailOriginale, PASSWORD)));
	}

	@Test
	void gliAltriLoVedonoComeUtenteAnonimoNonAttivo() {
		anonimizza(anna, PASSWORD);

		UtentePubblicoResponse pubblico = UtentePubblicoResponse.da(ricarica(anna));
		assertThat(pubblico.nome() + " " + pubblico.cognome()).isEqualTo("Utente anonimo");
		assertThat(pubblico.immagineProfilo()).isNull();
		assertThat(pubblico.attivo()).isFalse();
	}

	// --- Amicizie ---

	@Test
	void richiestePendentiRitirateConLeLoroNotifiche() {
		Utente luigi = utente("Luigi", "USER");
		Utente peach = utente("Peach", "USER");
		Evento evento = evento(mario);
		Amicizia inviata = amicizia(anna, luigi, StatoAmicizia.PENDENTE, evento);
		Amicizia ricevuta = amicizia(peach, anna, StatoAmicizia.PENDENTE, evento);
		notificaAmicizia(luigi, inviata, TipoNotificaAmicizia.RICHIESTA);
		notificaAmicizia(anna, ricevuta, TipoNotificaAmicizia.RICHIESTA);

		anonimizza(anna, PASSWORD);

		for (Amicizia amicizia : new Amicizia[] {inviata, ricevuta}) {
			Amicizia riga = amiciziaRepository.findById(amicizia.getId()).orElseThrow();
			assertThat(riga.getStato()).isEqualTo(StatoAmicizia.RITIRATA);
			assertThat(riga.getChiusaDa()).isNull();
		}
		assertThat(notificaAmiciziaRepository.countByDestinatarioIdAndLettaFalse(luigi.getId())).isZero();
	}

	@Test
	void leAmicizieAccettateRestanoConLaChat() {
		Amicizia accettata = amicizia(anna, mario, StatoAmicizia.ACCETTATA, evento(mario));
		Chat chat = chat(accettata);

		anonimizza(anna, PASSWORD);

		assertThat(amiciziaRepository.findById(accettata.getId()).orElseThrow().getStato())
				.isEqualTo(StatoAmicizia.ACCETTATA);
		assertThat(chatRepository.findById(chat.getId())).isPresent();
	}

	// --- Notifiche ---

	@Test
	void leNotificheRicevuteSiCancellanoQuelleDegliAltriNo() {
		Evento evento = evento(mario);
		Amicizia accettata = amicizia(anna, mario, StatoAmicizia.ACCETTATA, evento);
		Chat chat = chat(accettata);
		notificaEvento(anna, evento);
		notificaEvento(mario, evento);
		notificaAmicizia(anna, accettata, TipoNotificaAmicizia.ACCETTATA);
		notificaAmicizia(mario, accettata, TipoNotificaAmicizia.ACCETTATA);
		notificaChat(anna, chat);
		notificaChat(mario, chat);

		anonimizza(anna, PASSWORD);

		assertThat(notificaEventoRepository.countByDestinatarioIdAndLettaFalse(anna.getId())).isZero();
		assertThat(notificaAmiciziaRepository.countByDestinatarioIdAndLettaFalse(anna.getId())).isZero();
		assertThat(notificaChatRepository.countByDestinatarioIdAndLettaFalse(anna.getId())).isZero();
		assertThat(notificaEventoRepository.countByDestinatarioIdAndLettaFalse(mario.getId())).isEqualTo(1);
		assertThat(notificaAmiciziaRepository.countByDestinatarioIdAndLettaFalse(mario.getId())).isEqualTo(1);
		assertThat(notificaChatRepository.countByDestinatarioIdAndLettaFalse(mario.getId())).isEqualTo(1);
	}

	// --- Eventi (BE1-21) ---

	@Test
	void suoiEventiFuturiAnnullatiESueIscrizioniFutureCancellate() {
		Evento suo = evento(anna);
		iscrivi(mario, suo);
		Evento diMario = evento(mario);
		iscrivi(anna, diMario);

		anonimizza(anna, PASSWORD);

		assertThat(eventoRepository.findById(suo.getId()).orElseThrow().getStato()).isEqualTo(StatoEventoDb.ANNULLATO);
		assertThat(partecipanteRepository.existsByEventoIdAndUtenteId(diMario.getId(), anna.getId())).isFalse();
		// La notifica ANNULLAMENTO arriva ai partecipanti, ed e' di mario: resta.
		assertThat(notificaEventoRepository.findByEventoIdAndTipoAndLettaFalse(suo.getId(), TipoNotificaEvento.ANNULLAMENTO))
				.singleElement().satisfies(n -> assertThat(n.getDestinatario().getId()).isEqualTo(mario.getId()));
	}

	// --- Supporto ---

	private void anonimizza(Utente utente, String password) {
		anonimizzazioneService.anonimizza(autenticato(utente), new AnonimizzazioneRequest(password));
	}

	private UtenteAutenticato autenticato(Utente utente) {
		return tokenService.verifica(tokenService.emetti(utente).token()).orElseThrow();
	}

	private Utente ricarica(Utente utente) {
		return utenteRepository.findById(utente.getId()).orElseThrow();
	}

	private void assertErrore(CodiceErrore atteso, Executable azione) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, azione);
		assertThat(ex.getCodiceErrore()).isEqualTo(atteso);
	}

	/** I SUPERADMIN gia' nel database locale: sospesi solo dentro il test, che poi viene annullato. */
	private void sospendiAltriSuperadmin() {
		utenteRepository.trovaConLockPerRuoloEStato("SUPERADMIN", StatoUtente.ATTIVO).forEach(u -> {
			u.setStato(StatoUtente.SOSPESO);
			utenteRepository.saveAndFlush(u);
		});
	}

	private Utente utente(String nome, String ruolo) {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome(ruolo).orElseThrow());
		utente.setEmail("test-" + UUID.randomUUID() + "@nosey.test");
		utente.setPasswordHash(passwordEncoder.encode(PASSWORD));
		utente.setNome(nome);
		utente.setCognome("Test");
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

	private void iscrivi(Utente utente, Evento evento) {
		Partecipante partecipante = new Partecipante();
		partecipante.setUtente(utente);
		partecipante.setEvento(evento);
		partecipante.setCodice(UUID.randomUUID());
		partecipante.setEmessoIl(Instant.now());
		partecipanteRepository.save(partecipante);
	}

	private Amicizia amicizia(Utente richiedente, Utente ricevente, StatoAmicizia stato, Evento evento) {
		Instant ieri = Instant.now().minus(Duration.ofDays(1));
		Amicizia amicizia = new Amicizia();
		amicizia.setRichiedente(richiedente);
		amicizia.setRicevente(ricevente);
		amicizia.setEvento(evento);
		amicizia.setStato(stato);
		amicizia.setCreataIl(ieri);
		amicizia.setAggiornataIl(ieri);
		return amiciziaRepository.saveAndFlush(amicizia);
	}

	private Chat chat(Amicizia amicizia) {
		Chat chat = new Chat();
		chat.setAmicizia(amicizia);
		chat.setCreataIl(Instant.now());
		return chatRepository.saveAndFlush(chat);
	}

	private void notificaEvento(Utente destinatario, Evento evento) {
		NotificaEvento notifica = new NotificaEvento();
		notifica.setDestinatario(destinatario);
		notifica.setEvento(evento);
		notifica.setTipo(TipoNotificaEvento.MANUALE);
		notifica.setTesto("Ci vediamo all'ingresso");
		notifica.setCreataIl(Instant.now());
		notificaEventoRepository.save(notifica);
	}

	private void notificaAmicizia(Utente destinatario, Amicizia amicizia, TipoNotificaAmicizia tipo) {
		NotificaAmicizia notifica = new NotificaAmicizia();
		notifica.setDestinatario(destinatario);
		notifica.setAmicizia(amicizia);
		notifica.setTipo(tipo);
		notifica.setCreataIl(Instant.now());
		notificaAmiciziaRepository.save(notifica);
	}

	private void notificaChat(Utente destinatario, Chat chat) {
		NotificaChat notifica = new NotificaChat();
		notifica.setDestinatario(destinatario);
		notifica.setChat(chat);
		notifica.setAggiornataIl(Instant.now());
		notificaChatRepository.save(notifica);
	}
}
