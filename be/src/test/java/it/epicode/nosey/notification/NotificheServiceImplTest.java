package it.epicode.nosey.notification;

import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.friendship.AmiciziaRepository;
import it.epicode.nosey.ticket.Partecipante;
import it.epicode.nosey.ticket.PartecipanteRepository;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test di integrazione sul database locale (quello di application.yml, con JWT_SECRET impostato):
 * ogni test gira in una transazione annullata alla fine, non lascia dati.
 */
@SpringBootTest
@Transactional
@RecordApplicationEvents
class NotificheServiceImplTest {

	@Autowired
	private NotificheService notificheService;
	@Autowired
	private NotificaEventoRepository notificaEventoRepository;
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
	private AmiciziaRepository amiciziaRepository;
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
		evento = new Evento();
		evento.setProprietario(proprietario);
		evento.setTitolo("Concerto al parco");
		evento.setDataEvento(Instant.now().plus(Duration.ofDays(7)));
		evento.setDataFine(Instant.now().plus(Duration.ofDays(8)));
		evento.setLat(45.07);
		evento.setLng(7.69);
		evento.setCreatoIl(Instant.now());
		evento = eventoRepository.save(evento);
	}

	@Test
	void treModificheDiFila_unaSolaNotificaNonLettaPerPartecipante() {
		iscrivi(mario);
		iscrivi(luigi);

		notificheService.notificaModifica(evento, Set.of(ParteEvento.LUOGO, ParteEvento.DATE));
		notificheService.notificaModifica(evento, Set.of(ParteEvento.ARTISTI));
		notificheService.notificaModifica(evento, Set.of(ParteEvento.MAPPA_INTERNA));

		List<NotificaEvento> nonLette = nonLette(TipoNotificaEvento.MODIFICA);
		assertThat(nonLette).hasSize(2);
		assertThat(nonLette).extracting(n -> n.getDestinatario().getId())
				.containsExactlyInAnyOrder(mario.getId(), luigi.getId());
		assertThat(nonLette).extracting(NotificaEvento::getTesto)
				.containsOnly("L'evento «Concerto al parco» è cambiato più volte: aprilo per vedere i dettagli");
		assertThat(tutte()).hasSize(2);

		// 3 push per partecipante, sempre con lo stesso id: il frontend sostituisce senza contare.
		List<NotificaLiveEvent> live = live();
		assertThat(live).hasSize(6);
		assertThat(live.stream().filter(e -> e.destinatarioId().equals(mario.getId()))
				.map(e -> e.notifica().id()).distinct()).hasSize(1);
	}

	@Test
	void primaModifica_testoConLePartiInOrdineFisso() {
		iscrivi(mario);

		notificheService.notificaModifica(evento, Set.of(ParteEvento.LUOGO, ParteEvento.DATE));

		assertThat(nonLette(TipoNotificaEvento.MODIFICA)).singleElement()
				.extracting(NotificaEvento::getTesto)
				.isEqualTo("L'evento «Concerto al parco» è cambiato: date, luogo");
		NotificaResponse response = live().getFirst().notifica();
		assertThat(response.categoria()).isEqualTo(CategoriaNotifica.EVENTS);
		assertThat(response.tipo()).isEqualTo("MODIFICA");
		assertThat(response.riferimentoId()).isEqualTo(evento.getId());
		assertThat(response.letta()).isFalse();
	}

	@Test
	void modificaDopoLaLettura_creaUnaNuovaNotifica() {
		iscrivi(mario);
		notificheService.notificaModifica(evento, Set.of(ParteEvento.TITOLO));
		nonLette(TipoNotificaEvento.MODIFICA).forEach(n -> n.setLetta(true));

		notificheService.notificaModifica(evento, Set.of(ParteEvento.DESCRIZIONE));

		assertThat(tutte()).hasSize(2);
		assertThat(nonLette(TipoNotificaEvento.MODIFICA)).singleElement()
				.extracting(NotificaEvento::getTesto)
				.isEqualTo("L'evento «Concerto al parco» è cambiato: descrizione");
	}

	@Test
	void nessunaParteCambiata_nessunaNotifica() {
		iscrivi(mario);

		notificheService.notificaModifica(evento, Set.of());

		assertThat(tutte()).isEmpty();
		assertThat(live()).isEmpty();
	}

	@Test
	void iscrizioni_accorpateAlProprietarioSenzaNomi() {
		iscrivi(mario);
		notificheService.notificaIscrizione(evento);
		assertThat(nonLette(TipoNotificaEvento.ISCRIZIONE)).singleElement()
				.extracting(NotificaEvento::getTesto)
				.isEqualTo("Nuova iscrizione a «Concerto al parco»: ora 1 partecipante");

		iscrivi(luigi);
		notificheService.notificaIscrizione(evento);

		List<NotificaEvento> nonLette = nonLette(TipoNotificaEvento.ISCRIZIONE);
		assertThat(nonLette).singleElement().satisfies(n -> {
			assertThat(n.getDestinatario().getId()).isEqualTo(proprietario.getId());
			assertThat(n.getTesto()).isEqualTo("Nuove iscrizioni a «Concerto al parco»: ora 2 partecipanti");
		});
	}

	@Test
	void manuale_maiAccorpata() {
		iscrivi(mario);
		iscrivi(luigi);

		assertThat(notificheService.notificaManuale(evento, "  Si parte alle 21  ")).isEqualTo(2);
		assertThat(notificheService.notificaManuale(evento, "Portate l'ombrello")).isEqualTo(2);

		assertThat(nonLette(TipoNotificaEvento.MANUALE)).hasSize(4)
				.extracting(NotificaEvento::getTesto)
				.containsOnly("Si parte alle 21", "Portate l'ombrello");
	}

	@Test
	void annullamento_conMotivoAiPartecipanti() {
		iscrivi(mario);
		evento.setMotivoAnnullamento("maltempo");

		notificheService.notificaAnnullamento(evento);
		notificheService.notificaAnnullataDaModerazione(evento);

		assertThat(nonLette(TipoNotificaEvento.ANNULLAMENTO)).singleElement().satisfies(n -> {
			assertThat(n.getDestinatario().getId()).isEqualTo(mario.getId());
			assertThat(n.getTesto()).isEqualTo("L'evento «Concerto al parco» è stato annullato: maltempo");
		});
		assertThat(nonLette(TipoNotificaEvento.MODERAZIONE)).singleElement().satisfies(n -> {
			assertThat(n.getDestinatario().getId()).isEqualTo(proprietario.getId());
			assertThat(n.getTesto())
					.isEqualTo("Il tuo evento «Concerto al parco» è stato annullato dalla moderazione: maltempo");
		});
	}

	@Test
	void amicizia_testoGeneratoConIlNomeDellAltroUtente() {
		Amicizia amicizia = new Amicizia();
		amicizia.setRichiedente(mario);
		amicizia.setRicevente(luigi);
		amicizia.setEvento(evento);
		amicizia.setCreataIl(Instant.now());
		amicizia.setAggiornataIl(Instant.now());
		UUID amiciziaId = amiciziaRepository.save(amicizia).getId();

		notificheService.notificaRichiestaAmicizia(amicizia);
		notificheService.notificaAmiciziaAccettata(amicizia);

		List<NotificaLiveEvent> live = live();
		assertThat(live).hasSize(2);
		assertThat(live.get(0).destinatarioId()).isEqualTo(luigi.getId());
		assertThat(live.get(0).notifica().testo()).isEqualTo("Mario Rossi ti ha chiesto l'amicizia");
		assertThat(live.get(0).notifica().categoria()).isEqualTo(CategoriaNotifica.FRIENDSHIPS);
		assertThat(live.get(0).notifica().riferimentoId()).isEqualTo(amiciziaId);
		assertThat(live.get(1).destinatarioId()).isEqualTo(mario.getId());
		assertThat(live.get(1).notifica().testo()).isEqualTo("Luigi Verdi ha accettato la tua richiesta di amicizia");
		assertThat(notificaAmiciziaRepository.findAll())
				.filteredOn(n -> n.getAmicizia().getId().equals(amiciziaId))
				.hasSize(2);
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

	private void iscrivi(Utente utente) {
		Partecipante partecipante = new Partecipante();
		partecipante.setUtente(utente);
		partecipante.setEvento(evento);
		partecipante.setCodice(UUID.randomUUID());
		partecipante.setEmessoIl(Instant.now());
		partecipanteRepository.save(partecipante);
	}

	private List<NotificaEvento> nonLette(TipoNotificaEvento tipo) {
		return notificaEventoRepository.findByEventoIdAndTipoAndLettaFalse(evento.getId(), tipo);
	}

	private List<NotificaEvento> tutte() {
		return notificaEventoRepository.findAll().stream()
				.filter(n -> n.getEvento().getId().equals(evento.getId()))
				.toList();
	}

	private List<NotificaLiveEvent> live() {
		return applicationEvents.stream(NotificaLiveEvent.class).toList();
	}
}
