package it.epicode.nosey.event;

import it.epicode.nosey.notification.NotificaEvento;
import it.epicode.nosey.notification.NotificaEventoRepository;
import it.epicode.nosey.notification.TipoNotificaEvento;
import it.epicode.nosey.ticket.Partecipante;
import it.epicode.nosey.ticket.PartecipanteRepository;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Lato eventi dell'anonimizzazione (progettazione v4, sezione 2; decisione 13): si toccano solo
 * gli eventi davvero futuri. In corso, conclusi e annullati restano come sono, con i loro ticket.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class AnonimizzazioneEventiTest {

	@Autowired
	private AnonimizzazioneEventiService anonimizzazioneEventiService;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private PartecipanteRepository partecipanteRepository;
	@Autowired
	private NotificaEventoRepository notificaEventoRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;

	private Utente anonimo;
	private Utente mario;
	private Utente altroProprietario;

	@BeforeEach
	void prepara() {
		anonimo = utente("Anna", "Bianchi");
		mario = utente("Mario", "Rossi");
		altroProprietario = utente("Luigi", "Verdi");
	}

	// --- annullaEventiProprietario ---

	@Test
	void eventoFuturoAnnullatoConNotificaAiPartecipanti() {
		Evento futuro = futuro(anonimo);
		iscrivi(mario, futuro);

		anonimizzazioneEventiService.annullaEventiProprietario(anonimo.getId());

		assertThat(stato(futuro)).isEqualTo(StatoEventoDb.ANNULLATO);
		assertThat(annullamenti(futuro)).singleElement()
				.satisfies(n -> assertThat(n.getDestinatario().getId()).isEqualTo(mario.getId()));
	}

	@Test
	void eventiInCorsoEConclusiRestanoSenzaNotifiche() {
		Evento inCorso = inCorso(anonimo);
		Evento concluso = concluso(anonimo);
		iscrivi(mario, inCorso);
		iscrivi(mario, concluso);

		anonimizzazioneEventiService.annullaEventiProprietario(anonimo.getId());

		assertThat(stato(inCorso)).isEqualTo(StatoEventoDb.PROGRAMMATO);
		assertThat(stato(concluso)).isEqualTo(StatoEventoDb.PROGRAMMATO);
		assertThat(annullamenti(inCorso)).isEmpty();
		assertThat(annullamenti(concluso)).isEmpty();
	}

	@Test
	void eventoGiaAnnullatoNonRiceveUnaSecondaNotifica() {
		Evento annullato = annullato(anonimo);
		iscrivi(mario, annullato);

		anonimizzazioneEventiService.annullaEventiProprietario(anonimo.getId());

		assertThat(annullamenti(annullato)).isEmpty();
	}

	@Test
	void gliEventiDegliAltriNonSiToccano() {
		Evento dellAltro = futuro(altroProprietario);
		iscrivi(anonimo, dellAltro);

		anonimizzazioneEventiService.annullaEventiProprietario(anonimo.getId());

		assertThat(stato(dellAltro)).isEqualTo(StatoEventoDb.PROGRAMMATO);
	}

	// --- cancellaIscrizioniFuture ---

	@Test
	void ticketDiEventiFuturiCancellati() {
		Evento futuro = futuro(altroProprietario);
		iscrivi(anonimo, futuro);

		anonimizzazioneEventiService.cancellaIscrizioniFuture(anonimo.getId());

		assertThat(iscritto(anonimo, futuro)).isFalse();
	}

	@Test
	void ticketDiEventiInCorsoConclusiEAnnullatiRestano() {
		Evento inCorso = inCorso(altroProprietario);
		Evento concluso = concluso(altroProprietario);
		Evento annullato = annullato(altroProprietario);
		iscrivi(anonimo, inCorso);
		iscrivi(anonimo, concluso);
		iscrivi(anonimo, annullato);

		anonimizzazioneEventiService.cancellaIscrizioniFuture(anonimo.getId());

		assertThat(iscritto(anonimo, inCorso)).isTrue();
		assertThat(iscritto(anonimo, concluso)).isTrue();
		assertThat(iscritto(anonimo, annullato)).isTrue();
	}

	@Test
	void iTicketDegliAltriIscrittiRestano() {
		Evento futuro = futuro(altroProprietario);
		iscrivi(anonimo, futuro);
		iscrivi(mario, futuro);

		anonimizzazioneEventiService.cancellaIscrizioniFuture(anonimo.getId());

		assertThat(iscritto(mario, futuro)).isTrue();
	}

	// --- Supporto ---

	private StatoEventoDb stato(Evento evento) {
		return eventoRepository.findById(evento.getId()).orElseThrow().getStato();
	}

	private List<NotificaEvento> annullamenti(Evento evento) {
		return notificaEventoRepository.findByEventoIdAndTipoAndLettaFalse(evento.getId(), TipoNotificaEvento.ANNULLAMENTO);
	}

	private boolean iscritto(Utente utente, Evento evento) {
		return partecipanteRepository.existsByEventoIdAndUtenteId(evento.getId(), utente.getId());
	}

	private void iscrivi(Utente utente, Evento evento) {
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

	private Evento futuro(Utente proprietario) {
		return evento(proprietario, Duration.ofDays(7), Duration.ofDays(8), StatoEventoDb.PROGRAMMATO);
	}

	private Evento inCorso(Utente proprietario) {
		return evento(proprietario, Duration.ofHours(-1), Duration.ofHours(2), StatoEventoDb.PROGRAMMATO);
	}

	private Evento concluso(Utente proprietario) {
		return evento(proprietario, Duration.ofDays(-8), Duration.ofDays(-7), StatoEventoDb.PROGRAMMATO);
	}

	private Evento annullato(Utente proprietario) {
		return evento(proprietario, Duration.ofDays(7), Duration.ofDays(8), StatoEventoDb.ANNULLATO);
	}

	private Evento evento(Utente proprietario, Duration inizio, Duration fine, StatoEventoDb stato) {
		Instant adesso = Instant.now();
		Evento evento = new Evento();
		evento.setProprietario(proprietario);
		evento.setTitolo("Concerto al parco");
		evento.setDataEvento(adesso.plus(inizio));
		evento.setDataFine(adesso.plus(fine));
		evento.setStato(stato);
		evento.setLat(45.07);
		evento.setLng(7.69);
		evento.setCreatoIl(adesso);
		return eventoRepository.save(evento);
	}
}
