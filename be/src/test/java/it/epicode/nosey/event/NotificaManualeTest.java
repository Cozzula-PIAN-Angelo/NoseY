package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.notification.NotificaEvento;
import it.epicode.nosey.notification.NotificaEventoRepository;
import it.epicode.nosey.notification.NotificaLiveEvent;
import it.epicode.nosey.notification.TipoNotificaEvento;
import it.epicode.nosey.ticket.Partecipante;
import it.epicode.nosey.ticket.PartecipanteRepository;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * InviaNotificaManuale (progettazione v4, sezione 10; decisione 19 per la posizione del 429).
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
@RecordApplicationEvents
class NotificaManualeTest {

	@Autowired
	private EventoService eventoService;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private NotificaEventoRepository notificaEventoRepository;
	@Autowired
	private PartecipanteRepository partecipanteRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private ApplicationEvents applicationEvents;

	private Utente proprietario;
	private Utente mario;
	private Utente luigi;
	private Evento evento;

	@BeforeEach
	void prepara() {
		proprietario = utente("Anna", "Bianchi");
		mario = utente("Mario", "Rossi");
		luigi = utente("Luigi", "Verdi");
		evento = evento(proprietario);
	}

	// --- Caso riuscito ---

	@Test
	void unaNotificaManualePerOgniPartecipanteSalvataELive() {
		iscrivi(mario);
		iscrivi(luigi);

		NotificaManualeResponse risposta = invia(proprietario, "  Si parte alle 21:30, portate una giacca  ");

		assertThat(risposta.inviate()).isEqualTo(2);
		List<NotificaEvento> notifiche = manuali();
		assertThat(notifiche).extracting(n -> n.getDestinatario().getId())
				.containsExactlyInAnyOrder(mario.getId(), luigi.getId());
		assertThat(notifiche).extracting(NotificaEvento::getTesto)
				.containsOnly("Si parte alle 21:30, portate una giacca");
		assertThat(applicationEvents.stream(NotificaLiveEvent.class)).hasSize(2);
	}

	@Test
	void maiAccorpata() {
		iscrivi(mario);

		invia(proprietario, "Primo avviso");
		invia(proprietario, "Secondo avviso");

		assertThat(manuali()).extracting(NotificaEvento::getTesto)
				.containsExactlyInAnyOrder("Primo avviso", "Secondo avviso");
	}

	@Test
	void senzaPartecipantiInviateZero() {
		assertThat(invia(proprietario, "Nessuno lo leggera'").inviate()).isZero();
		assertThat(manuali()).isEmpty();
	}

	// --- Errori: 404 → 403 → 429 → 409 (decisione 19) ---

	@Test
	void eventoInesistente404() {
		assertErrore(CodiceErrore.NON_TROVATO, () -> eventoService.inviaNotificaManuale(UUID.randomUUID(),
				proprietario.getId(), "Testo"));
	}

	@Test
	void nonProprietario403() {
		iscrivi(mario);
		assertErrore(CodiceErrore.NON_PROPRIETARIO, () -> invia(mario, "Testo"));
		assertThat(manuali()).isEmpty();
	}

	@Test
	void sestaNotificaInUnGiorno429() {
		for (int i = 0; i < 5; i++) {
			invia(proprietario, "Avviso " + i);
		}
		assertErrore(CodiceErrore.TROPPE_RICHIESTE, () -> invia(proprietario, "Avviso di troppo"));
	}

	@Test
	void iTentativiDiUnNonProprietarioNonConsumanoIlLimite() {
		for (int i = 0; i < 6; i++) {
			assertErrore(CodiceErrore.NON_PROPRIETARIO, () -> invia(mario, "Testo"));
		}
		invia(proprietario, "Il proprietario puo' ancora inviare");
	}

	@Test
	void eventoAnnullato409() {
		evento.setStato(StatoEventoDb.ANNULLATO);
		assertErrore(CodiceErrore.EVENTO_ANNULLATO, () -> invia(proprietario, "Testo"));
	}

	@Test
	void eventoConcluso409() {
		evento.setDataEvento(Instant.now().minus(Duration.ofDays(3)));
		evento.setDataFine(Instant.now().minus(Duration.ofDays(2)));
		assertErrore(CodiceErrore.EVENTO_CONCLUSO, () -> invia(proprietario, "Testo"));
	}

	@Test
	void eventoInCorsoAccettato() {
		iscrivi(mario);
		evento.setDataEvento(Instant.now().minus(Duration.ofHours(1)));
		evento.setDataFine(Instant.now().plus(Duration.ofHours(3)));

		assertThat(invia(proprietario, "Siamo sul palco").inviate()).isEqualTo(1);
	}

	// --- Supporto ---

	private NotificaManualeResponse invia(Utente utente, String testo) {
		return eventoService.inviaNotificaManuale(evento.getId(), utente.getId(), testo);
	}

	private List<NotificaEvento> manuali() {
		return notificaEventoRepository.findByEventoIdAndTipoAndLettaFalse(evento.getId(), TipoNotificaEvento.MANUALE);
	}

	private void assertErrore(CodiceErrore atteso, Executable azione) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, azione);
		assertThat(ex.getCodiceErrore()).isEqualTo(atteso);
	}

	private void iscrivi(Utente utente) {
		Partecipante partecipante = new Partecipante();
		partecipante.setUtente(utente);
		partecipante.setEvento(evento);
		partecipante.setCodice(UUID.randomUUID());
		partecipante.setEmessoIl(Instant.now());
		partecipanteRepository.save(partecipante);
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
