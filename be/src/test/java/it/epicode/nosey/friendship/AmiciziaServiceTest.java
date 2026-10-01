package it.epicode.nosey.friendship;

import it.epicode.nosey.chat.Chat;
import it.epicode.nosey.chat.ChatRepository;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.Limite;
import it.epicode.nosey.common.LimitiService;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.notification.NotificaAmicizia;
import it.epicode.nosey.notification.NotificaAmiciziaRepository;
import it.epicode.nosey.notification.TipoNotificaAmicizia;
import it.epicode.nosey.ticket.Partecipante;
import it.epicode.nosey.ticket.PartecipanteRepository;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.StatoUtente;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * RichiediAmicizia (progettazione v4, sezione 8): ogni controllo e ogni caso della riga della coppia.
 * Test di integrazione sul database locale (decisione 10): ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class AmiciziaServiceTest {

	@Autowired
	private AmiciziaService amiciziaService;
	@Autowired
	private AmiciziaRepository amiciziaRepository;
	@Autowired
	private ChatRepository chatRepository;
	@Autowired
	private NotificaAmiciziaRepository notificaAmiciziaRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private PartecipanteRepository partecipanteRepository;
	@Autowired
	private LimitiService limitiService;

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
		iscrivi(mario, evento);
		iscrivi(luigi, evento);
	}

	// --- Controlli 1-5 ---

	@Test
	void oltreIlLimiteGiornaliero_troppeRichieste() {
		for (int i = 0; i < 30; i++) {
			limitiService.consuma(Limite.RICHIESTE_AMICIZIA, mario.getId().toString());
		}
		assertErrore(CodiceErrore.TROPPE_RICHIESTE, () -> richiedi(mario, luigi));
	}

	@Test
	void richiestaASeStesso() {
		assertErrore(CodiceErrore.RICHIESTA_A_SE_STESSO, () -> richiedi(mario, mario));
	}

	@Test
	void riceventeOEventoInesistente_nonTrovato() {
		assertErrore(CodiceErrore.NON_TROVATO, () -> amiciziaService.richiedi(
				new RichiediAmiciziaRequest(UUID.randomUUID(), evento.getId()), mario.getId()));
		assertErrore(CodiceErrore.NON_TROVATO, () -> amiciziaService.richiedi(
				new RichiediAmiciziaRequest(luigi.getId(), UUID.randomUUID()), mario.getId()));
	}

	@Test
	void senzaTicket_daUnaParteODallAltra() {
		Utente estraneo = utente("Paolo", "Neri");
		assertErrore(CodiceErrore.NESSUN_TICKET, () -> richiedi(estraneo, mario));
		assertErrore(CodiceErrore.NESSUN_TICKET, () -> richiedi(mario, estraneo));
	}

	@Test
	void proprietarioContaComeSeAvesseIlTicket() {
		assertThat(richiedi(proprietario, mario).stato()).isEqualTo(StatoAmiciziaVista.INVIATA);
		assertThat(richiedi(luigi, proprietario).stato()).isEqualTo(StatoAmiciziaVista.INVIATA);
	}

	@Test
	void riceventeNonAttivo() {
		luigi.setStato(StatoUtente.SOSPESO);
		assertErrore(CodiceErrore.UTENTE_NON_ATTIVO, () -> richiedi(mario, luigi));
	}

	// --- Controllo 6: stato della riga della coppia ---

	@Test
	void nessunaRiga_pendenteENotificaAlRicevente() {
		AmiciziaResponse risposta = richiedi(mario, luigi);

		assertThat(risposta.stato()).isEqualTo(StatoAmiciziaVista.INVIATA);
		assertThat(risposta.altroUtente().id()).isEqualTo(luigi.getId());
		assertThat(risposta.eventoId()).isEqualTo(evento.getId());
		assertThat(risposta.chatId()).isNull();

		Amicizia amicizia = amiciziaRepository.findById(risposta.id()).orElseThrow();
		assertPendente(amicizia, mario, luigi, evento);
		assertThat(notifiche(luigi)).singleElement()
				.satisfies(n -> assertThat(n.getTipo()).isEqualTo(TipoNotificaAmicizia.RICHIESTA));
	}

	@Test
	void ritirata_rigaRiusata() {
		Amicizia riga = riga(luigi, mario, StatoAmicizia.RITIRATA, null, false);

		AmiciziaResponse risposta = richiedi(mario, luigi);

		assertThat(risposta.id()).isEqualTo(riga.getId());
		assertPendente(riga, mario, luigi, evento);
		assertThat(notifiche(luigi)).hasSize(1);
	}

	@Test
	void rifiutataChiusaDaMe_riaperta() {
		// Luigi aveva chiesto e Mario aveva rifiutato: Mario puo' riaprire.
		Amicizia riga = riga(luigi, mario, StatoAmicizia.RIFIUTATA, mario, true);

		richiedi(mario, luigi);

		assertPendente(riga, mario, luigi, evento);
		assertThat(notifiche(luigi)).hasSize(1);
	}

	@Test
	void rifiutataDalRicevente_nonMascherata_mascherataSenzaNotifica() {
		// Mario aveva chiesto, Luigi aveva rifiutato, poi Mario aveva ritirato (mascherata = false).
		Evento altroEvento = evento(proprietario);
		iscrivi(mario, altroEvento);
		iscrivi(luigi, altroEvento);
		Amicizia riga = riga(mario, luigi, StatoAmicizia.RIFIUTATA, luigi, false);
		Instant prima = riga.getAggiornataIl();

		AmiciziaResponse risposta = amiciziaService.richiedi(
				new RichiediAmiciziaRequest(luigi.getId(), altroEvento.getId()), mario.getId());

		assertThat(risposta.stato()).isEqualTo(StatoAmiciziaVista.INVIATA);
		assertThat(risposta.eventoId()).isEqualTo(altroEvento.getId());
		assertThat(riga.getStato()).isEqualTo(StatoAmicizia.RIFIUTATA);
		assertThat(riga.getChiusaDa()).isEqualTo(luigi);
		assertThat(riga.isRichiestaMascherata()).isTrue();
		assertThat(riga.getEvento()).isEqualTo(altroEvento);
		assertThat(riga.getAggiornataIl()).isAfter(prima);
		assertThat(notifiche(luigi)).isEmpty();
	}

	@Test
	void rifiutataDalRicevente_giaMascherata_richiestaGiaInviata() {
		riga(mario, luigi, StatoAmicizia.RIFIUTATA, luigi, true);
		assertErrore(CodiceErrore.RICHIESTA_GIA_INVIATA, () -> richiedi(mario, luigi));
	}

	@Test
	void pendenteDaMe_richiestaGiaInviata() {
		riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		assertErrore(CodiceErrore.RICHIESTA_GIA_INVIATA, () -> richiedi(mario, luigi));
	}

	@Test
	void pendenteDalRicevente_richiestaGiaRicevuta() {
		riga(luigi, mario, StatoAmicizia.PENDENTE, null, false);
		assertErrore(CodiceErrore.RICHIESTA_GIA_RICEVUTA, () -> richiedi(mario, luigi));
	}

	@Test
	void accettata_giaAmici() {
		riga(luigi, mario, StatoAmicizia.ACCETTATA, null, false);
		assertErrore(CodiceErrore.GIA_AMICI, () -> richiedi(mario, luigi));
	}

	@Test
	void rimossaDaMe_riapertaConLaStessaChat() {
		Amicizia riga = riga(luigi, mario, StatoAmicizia.RIMOSSA, mario, false);
		Chat chat = new Chat();
		chat.setAmicizia(riga);
		chat.setCreataIl(Instant.now());
		chat = chatRepository.save(chat);

		AmiciziaResponse risposta = richiedi(mario, luigi);

		assertThat(risposta.chatId()).isEqualTo(chat.getId());
		assertPendente(riga, mario, luigi, evento);
		assertThat(notifiche(luigi)).hasSize(1);
	}

	@Test
	void rimossaDalRicevente_nonDisponibile() {
		riga(mario, luigi, StatoAmicizia.RIMOSSA, luigi, false);
		assertErrore(CodiceErrore.AMICIZIA_NON_DISPONIBILE, () -> richiedi(mario, luigi));
	}

	// --- Supporto ---

	private AmiciziaResponse richiedi(Utente da, Utente a) {
		return amiciziaService.richiedi(new RichiediAmiciziaRequest(a.getId(), evento.getId()), da.getId());
	}

	private void assertErrore(CodiceErrore codice, Executable chiamata) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, chiamata);
		assertThat(ex.getCodiceErrore()).isEqualTo(codice);
	}

	private void assertPendente(Amicizia amicizia, Utente richiedente, Utente ricevente, Evento evento) {
		assertThat(amicizia.getStato()).isEqualTo(StatoAmicizia.PENDENTE);
		assertThat(amicizia.getRichiedente().getId()).isEqualTo(richiedente.getId());
		assertThat(amicizia.getRicevente().getId()).isEqualTo(ricevente.getId());
		assertThat(amicizia.getEvento().getId()).isEqualTo(evento.getId());
		assertThat(amicizia.getChiusaDa()).isNull();
		assertThat(amicizia.isRichiestaMascherata()).isFalse();
	}

	private List<NotificaAmicizia> notifiche(Utente destinatario) {
		return notificaAmiciziaRepository.findAll().stream()
				.filter(n -> n.getDestinatario().getId().equals(destinatario.getId()))
				.toList();
	}

	private Amicizia riga(Utente richiedente, Utente ricevente, StatoAmicizia stato, Utente chiusaDa,
			boolean mascherata) {
		Instant ieri = Instant.now().minus(Duration.ofDays(1));
		Amicizia amicizia = new Amicizia();
		amicizia.setRichiedente(richiedente);
		amicizia.setRicevente(ricevente);
		amicizia.setEvento(evento);
		amicizia.setStato(stato);
		amicizia.setChiusaDa(chiusaDa);
		amicizia.setRichiestaMascherata(mascherata);
		amicizia.setCreataIl(ieri);
		amicizia.setAggiornataIl(ieri);
		return amiciziaRepository.saveAndFlush(amicizia);
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

	private void iscrivi(Utente utente, Evento evento) {
		Partecipante partecipante = new Partecipante();
		partecipante.setUtente(utente);
		partecipante.setEvento(evento);
		partecipante.setCodice(UUID.randomUUID());
		partecipante.setEmessoIl(Instant.now());
		partecipanteRepository.save(partecipante);
	}
}
