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
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Amicizie (progettazione v4, sezione 8): ogni controllo e ogni caso della riga della coppia in
 * RichiediAmicizia, poi errori ed effetti di accetta, rifiuta, ritira e rimuovi, le tre liste e
 * ogni riga della tabella di statoAmicizia.
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
		Chat chat = chat(riga);

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

	// --- AccettaAmicizia ---

	@Test
	void accetta_amiciConChatNuova() {
		Amicizia riga = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		NotificaAmicizia richiesta = notifica(riga, luigi, TipoNotificaAmicizia.RICHIESTA);
		Instant prima = riga.getAggiornataIl();

		AmiciziaResponse risposta = amiciziaService.accetta(riga.getId(), luigi.getId());

		assertThat(risposta.id()).isEqualTo(riga.getId());
		assertThat(risposta.stato()).isEqualTo(StatoAmiciziaVista.AMICI);
		assertThat(risposta.altroUtente().id()).isEqualTo(mario.getId());
		assertThat(risposta.chatId()).isNotNull()
				.isEqualTo(chatRepository.trovaIdPerAmicizia(riga.getId()).orElseThrow());
		assertThat(riga.getStato()).isEqualTo(StatoAmicizia.ACCETTATA);
		assertThat(riga.getAggiornataIl()).isAfter(prima);
		assertThat(richiesta.isLetta()).isTrue();
		assertThat(notifiche(mario)).singleElement()
				.satisfies(n -> assertThat(n.getTipo()).isEqualTo(TipoNotificaAmicizia.ACCETTATA));
	}

	@Test
	void accetta_riusaLaChatDellaCoppia() {
		Amicizia riga = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		Chat chat = chat(riga);

		AmiciziaResponse risposta = amiciziaService.accetta(riga.getId(), luigi.getId());

		assertThat(risposta.chatId()).isEqualTo(chat.getId());
		assertThat(chatRepository.findAll()).filteredOn(c -> c.getAmicizia().getId().equals(riga.getId()))
				.hasSize(1);
	}

	@Test
	void accetta_errori() {
		Amicizia riga = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		Utente estraneo = utente("Paolo", "Neri");

		assertErrore(CodiceErrore.NON_TROVATO, () -> amiciziaService.accetta(UUID.randomUUID(), luigi.getId()));
		assertErrore(CodiceErrore.NON_TROVATO, () -> amiciziaService.accetta(riga.getId(), estraneo.getId()));
		assertErrore(CodiceErrore.NON_RICEVENTE, () -> amiciziaService.accetta(riga.getId(), mario.getId()));

		mario.setStato(StatoUtente.SOSPESO);
		assertErrore(CodiceErrore.UTENTE_NON_ATTIVO, () -> amiciziaService.accetta(riga.getId(), luigi.getId()));

		riga.setStato(StatoAmicizia.RITIRATA);
		assertErrore(CodiceErrore.NON_IN_ATTESA, () -> amiciziaService.accetta(riga.getId(), luigi.getId()));
	}

	// --- RifiutaAmicizia ---

	@Test
	void rifiuta_mascherataSenzaNotifica() {
		Amicizia riga = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		NotificaAmicizia richiesta = notifica(riga, luigi, TipoNotificaAmicizia.RICHIESTA);

		amiciziaService.rifiuta(riga.getId(), luigi.getId());

		assertThat(riga.getStato()).isEqualTo(StatoAmicizia.RIFIUTATA);
		assertThat(riga.getChiusaDa()).isEqualTo(luigi);
		assertThat(riga.isRichiestaMascherata()).isTrue();
		assertThat(richiesta.isLetta()).isTrue();
		assertThat(notifiche(mario)).isEmpty();
		// Per Mario la richiesta resta inviata (D7).
		assertErrore(CodiceErrore.RICHIESTA_GIA_INVIATA, () -> richiedi(mario, luigi));
	}

	@Test
	void rifiuta_errori() {
		Amicizia riga = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		Utente estraneo = utente("Paolo", "Neri");

		assertErrore(CodiceErrore.NON_TROVATO, () -> amiciziaService.rifiuta(riga.getId(), estraneo.getId()));
		assertErrore(CodiceErrore.NON_RICEVENTE, () -> amiciziaService.rifiuta(riga.getId(), mario.getId()));

		riga.setStato(StatoAmicizia.ACCETTATA);
		assertErrore(CodiceErrore.NON_IN_ATTESA, () -> amiciziaService.rifiuta(riga.getId(), luigi.getId()));
	}

	// --- RitiraRichiesta ---

	@Test
	void ritira_pendente_coppiaNeutra() {
		Amicizia riga = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		notifica(riga, luigi, TipoNotificaAmicizia.RICHIESTA);

		amiciziaService.ritira(riga.getId(), mario.getId());

		assertThat(riga.getStato()).isEqualTo(StatoAmicizia.RITIRATA);
		assertThat(notifiche(luigi)).isEmpty();
		// Coppia neutra: anche l'altro puo' chiedere.
		assertThat(richiedi(luigi, mario).stato()).isEqualTo(StatoAmiciziaVista.INVIATA);
	}

	@Test
	void ritira_rifiutataMascherata_ilRifiutoResta() {
		Amicizia riga = riga(mario, luigi, StatoAmicizia.RIFIUTATA, luigi, true);

		amiciziaService.ritira(riga.getId(), mario.getId());

		assertThat(riga.getStato()).isEqualTo(StatoAmicizia.RIFIUTATA);
		assertThat(riga.getChiusaDa()).isEqualTo(luigi);
		assertThat(riga.isRichiestaMascherata()).isFalse();
	}

	@Test
	void ritira_errori() {
		Amicizia riga = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		Utente estraneo = utente("Paolo", "Neri");

		assertErrore(CodiceErrore.NON_TROVATO, () -> amiciziaService.ritira(riga.getId(), estraneo.getId()));
		assertErrore(CodiceErrore.NON_RICHIEDENTE, () -> amiciziaService.ritira(riga.getId(), luigi.getId()));

		riga.setStato(StatoAmicizia.RIFIUTATA);
		riga.setChiusaDa(luigi);
		riga.setRichiestaMascherata(false);
		assertErrore(CodiceErrore.NON_IN_ATTESA, () -> amiciziaService.ritira(riga.getId(), mario.getId()));

		riga.setStato(StatoAmicizia.ACCETTATA);
		riga.setChiusaDa(null);
		assertErrore(CodiceErrore.NON_IN_ATTESA, () -> amiciziaService.ritira(riga.getId(), mario.getId()));
	}

	// --- RimuoviAmicizia ---

	@Test
	void rimuovi_soloChiHaRimossoPuoRichiedereDiNuovo() {
		// Mario aveva chiesto, Luigi aveva accettato: ora Luigi rimuove.
		Amicizia riga = riga(mario, luigi, StatoAmicizia.ACCETTATA, null, false);
		Chat chat = chat(riga);

		amiciziaService.rimuovi(riga.getId(), luigi.getId());

		assertThat(riga.getStato()).isEqualTo(StatoAmicizia.RIMOSSA);
		assertThat(riga.getChiusaDa().getId()).isEqualTo(luigi.getId());
		assertThat(chatRepository.trovaIdPerAmicizia(riga.getId())).contains(chat.getId());
		assertThat(notifiche(mario)).isEmpty();

		assertErrore(CodiceErrore.AMICIZIA_NON_DISPONIBILE, () -> richiedi(mario, luigi));
		AmiciziaResponse risposta = richiedi(luigi, mario);
		assertThat(risposta.stato()).isEqualTo(StatoAmiciziaVista.INVIATA);
		assertThat(risposta.id()).isEqualTo(riga.getId());
		assertThat(risposta.chatId()).isEqualTo(chat.getId());
	}

	@Test
	void rimuovi_errori() {
		Amicizia riga = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		Utente estraneo = utente("Paolo", "Neri");

		assertErrore(CodiceErrore.NON_TROVATO, () -> amiciziaService.rimuovi(UUID.randomUUID(), mario.getId()));
		assertErrore(CodiceErrore.NON_TROVATO, () -> amiciziaService.rimuovi(riga.getId(), estraneo.getId()));
		assertErrore(CodiceErrore.NON_AMICI, () -> amiciziaService.rimuovi(riga.getId(), mario.getId()));
	}

	// --- ListaAmici, ListaRichiesteRicevute, ListaRichiesteInviate ---

	@Test
	void amici_perNomeConLaChat() {
		Utente bruno = utente("bruno", "Gialli");
		Utente paolo = utente("Paolo", "Neri");
		Amicizia conLuigi = riga(mario, luigi, StatoAmicizia.ACCETTATA, null, false);
		Amicizia conAnna = riga(proprietario, mario, StatoAmicizia.ACCETTATA, null, false);
		Amicizia conBruno = riga(bruno, mario, StatoAmicizia.ACCETTATA, null, false);
		riga(mario, paolo, StatoAmicizia.PENDENTE, null, false);
		Chat chatLuigi = chat(conLuigi);
		Chat chatAnna = chat(conAnna);
		Chat chatBruno = chat(conBruno);

		List<AmiciziaResponse> amici = amiciziaService.amici(mario.getId());

		// Per nome senza distinguere le maiuscole: Anna, bruno, Luigi. Paolo e' solo in attesa.
		assertThat(amici).extracting(r -> r.altroUtente().id())
				.containsExactly(proprietario.getId(), bruno.getId(), luigi.getId());
		assertThat(amici).extracting(AmiciziaResponse::chatId)
				.containsExactly(chatAnna.getId(), chatBruno.getId(), chatLuigi.getId());
		assertThat(amici).extracting(AmiciziaResponse::stato).containsOnly(StatoAmiciziaVista.AMICI);
		assertThat(amici.getFirst().id()).isEqualTo(conAnna.getId());
		assertThat(amici.getFirst().eventoId()).isEqualTo(evento.getId());

		// Dal punto di vista dell'altro: Luigi ha un solo amico, Mario.
		assertThat(amiciziaService.amici(luigi.getId())).extracting(r -> r.altroUtente().id())
				.containsExactly(mario.getId());
	}

	@Test
	void richiesteRicevute_soloPendentiPerDataDecrescente() {
		Utente paolo = utente("Paolo", "Neri");
		Utente bruno = utente("Bruno", "Gialli");
		Amicizia daMario = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		Amicizia daPaolo = riga(paolo, luigi, StatoAmicizia.PENDENTE, null, false);
		daPaolo.setAggiornataIl(Instant.now());
		// Rifiutata da Luigi (mascherata per Bruno) e richiesta inviata da Luigi: non sono "ricevute".
		riga(bruno, luigi, StatoAmicizia.RIFIUTATA, luigi, true);
		riga(luigi, proprietario, StatoAmicizia.PENDENTE, null, false);

		List<AmiciziaResponse> ricevute = amiciziaService.richiesteRicevute(luigi.getId());

		assertThat(ricevute).extracting(AmiciziaResponse::id).containsExactly(daPaolo.getId(), daMario.getId());
		assertThat(ricevute).extracting(r -> r.altroUtente().id()).containsExactly(paolo.getId(), mario.getId());
		assertThat(ricevute).extracting(AmiciziaResponse::stato).containsOnly(StatoAmiciziaVista.RICEVUTA);
		assertThat(ricevute).extracting(AmiciziaResponse::chatId).containsOnlyNulls();
	}

	@Test
	void richiesteInviate_pendentiEMascheratePerDataDecrescente() {
		Utente paolo = utente("Paolo", "Neri");
		Utente bruno = utente("Bruno", "Gialli");
		Utente carla = utente("Carla", "Blu");
		Amicizia aLuigi = riga(mario, luigi, StatoAmicizia.PENDENTE, null, false);
		Amicizia aPaolo = riga(mario, paolo, StatoAmicizia.RIFIUTATA, paolo, true);
		aPaolo.setAggiornataIl(Instant.now());
		// Rifiuto gia' ritirato, richiesta ritirata e richiesta ricevuta: non sono "inviate".
		riga(mario, bruno, StatoAmicizia.RIFIUTATA, bruno, false);
		riga(mario, carla, StatoAmicizia.RITIRATA, null, false);
		riga(proprietario, mario, StatoAmicizia.PENDENTE, null, false);

		List<AmiciziaResponse> inviate = amiciziaService.richiesteInviate(mario.getId());

		assertThat(inviate).extracting(AmiciziaResponse::id).containsExactly(aPaolo.getId(), aLuigi.getId());
		assertThat(inviate).extracting(r -> r.altroUtente().id()).containsExactly(paolo.getId(), luigi.getId());
		assertThat(inviate).extracting(AmiciziaResponse::stato).containsOnly(StatoAmiciziaVista.INVIATA);

		// Chi ha rifiutato non vede la richiesta da nessuna parte (D7).
		assertThat(amiciziaService.richiesteRicevute(paolo.getId())).isEmpty();
		assertThat(amiciziaService.richiesteInviate(paolo.getId())).isEmpty();
	}

	@Test
	void liste_conLaChatDellaCoppia() {
		// Luigi aveva rimosso Mario e ha chiesto di nuovo: la chat c'e' gia' (sola lettura).
		Amicizia riga = riga(luigi, mario, StatoAmicizia.PENDENTE, null, false);
		Chat chat = chat(riga);

		assertThat(amiciziaService.richiesteInviate(luigi.getId())).extracting(AmiciziaResponse::chatId)
				.containsExactly(chat.getId());
		assertThat(amiciziaService.richiesteRicevute(mario.getId())).extracting(AmiciziaResponse::chatId)
				.containsExactly(chat.getId());
	}

	@Test
	void liste_vuote() {
		assertThat(amiciziaService.amici(mario.getId())).isEmpty();
		assertThat(amiciziaService.richiesteRicevute(mario.getId())).isEmpty();
		assertThat(amiciziaService.richiesteInviate(mario.getId())).isEmpty();
	}

	// --- statoAmicizia (relazioni, per ListaPartecipanti) ---

	@Test
	void relazioni_ogniRigaDellaTabella() {
		Utente senzaRiga = utente("Nessuna", "Riga");
		Utente inviata = utente("Pendente", "DaMe");
		Utente ricevuta = utente("Pendente", "DaLui");
		Utente amico = utente("Accettata", "Amico");
		Utente ritirata = utente("Ritirata", "Neutra");
		Utente rifiutataDaMe = utente("Rifiutata", "DaMe");
		Utente mascherata = utente("Rifiutata", "Mascherata");
		Utente rifiutoRitirato = utente("Rifiutata", "Ritirata");
		Utente rimossaDaMe = utente("Rimossa", "DaMe");
		Utente rimossaDaLui = utente("Rimossa", "DaLui");

		Amicizia rigaInviata = riga(mario, inviata, StatoAmicizia.PENDENTE, null, false);
		Amicizia rigaRicevuta = riga(ricevuta, mario, StatoAmicizia.PENDENTE, null, false);
		Amicizia rigaAmico = riga(amico, mario, StatoAmicizia.ACCETTATA, null, false);
		riga(mario, ritirata, StatoAmicizia.RITIRATA, null, false);
		riga(rifiutataDaMe, mario, StatoAmicizia.RIFIUTATA, mario, true);
		Amicizia rigaMascherata = riga(mario, mascherata, StatoAmicizia.RIFIUTATA, mascherata, true);
		riga(mario, rifiutoRitirato, StatoAmicizia.RIFIUTATA, rifiutoRitirato, false);
		riga(rimossaDaMe, mario, StatoAmicizia.RIMOSSA, mario, false);
		Amicizia rigaRimossaDaLui = riga(mario, rimossaDaLui, StatoAmicizia.RIMOSSA, rimossaDaLui, false);
		// Chat: amici, richiesta riaperta dopo una rimozione, rimossa dall'altro (resta nascosta).
		Chat chatAmico = chat(rigaAmico);
		Chat chatInviata = chat(rigaInviata);
		chat(rigaRimossaDaLui);

		Map<UUID, RelazioneAmicizia> relazioni = amiciziaService.relazioni(mario.getId(), List.of(senzaRiga,
				inviata, ricevuta, amico, ritirata, rifiutataDaMe, mascherata, rifiutoRitirato, rimossaDaMe,
				rimossaDaLui));

		assertThat(relazioni).hasSize(10);
		assertThat(relazioni.get(senzaRiga.getId())).isEqualTo(RelazioneAmicizia.NESSUNA);
		assertThat(relazioni.get(inviata.getId()))
				.isEqualTo(new RelazioneAmicizia(StatoAmiciziaVista.INVIATA, rigaInviata.getId(), chatInviata.getId()));
		assertThat(relazioni.get(ricevuta.getId()))
				.isEqualTo(new RelazioneAmicizia(StatoAmiciziaVista.RICEVUTA, rigaRicevuta.getId(), null));
		assertThat(relazioni.get(amico.getId()))
				.isEqualTo(new RelazioneAmicizia(StatoAmiciziaVista.AMICI, rigaAmico.getId(), chatAmico.getId()));
		assertThat(relazioni.get(ritirata.getId())).isEqualTo(RelazioneAmicizia.NESSUNA);
		assertThat(relazioni.get(rifiutataDaMe.getId())).isEqualTo(RelazioneAmicizia.NESSUNA);
		assertThat(relazioni.get(mascherata.getId()))
				.isEqualTo(new RelazioneAmicizia(StatoAmiciziaVista.INVIATA, rigaMascherata.getId(), null));
		assertThat(relazioni.get(rifiutoRitirato.getId())).isEqualTo(RelazioneAmicizia.NESSUNA);
		assertThat(relazioni.get(rimossaDaMe.getId())).isEqualTo(RelazioneAmicizia.NESSUNA);
		assertThat(relazioni.get(rimossaDaLui.getId())).isEqualTo(RelazioneAmicizia.NON_DISPONIBILE);
	}

	@Test
	void relazioni_altroNonAttivo_tuttoTranneAmiciNonDisponibile() {
		Utente sospesoAmico = utente("Sospeso", "Amico");
		Utente sospesoInAttesa = utente("Sospeso", "InAttesa");
		Utente anonimizzato = utente("Utente", "Anonimo");
		Amicizia rigaAmico = riga(mario, sospesoAmico, StatoAmicizia.ACCETTATA, null, false);
		Chat chatAmico = chat(rigaAmico);
		riga(sospesoInAttesa, mario, StatoAmicizia.PENDENTE, null, false);
		sospesoAmico.setStato(StatoUtente.SOSPESO);
		sospesoInAttesa.setStato(StatoUtente.SOSPESO);
		anonimizzato.setStato(StatoUtente.ANONIMIZZATO);

		Map<UUID, RelazioneAmicizia> relazioni = amiciziaService.relazioni(mario.getId(),
				List.of(sospesoAmico, sospesoInAttesa, anonimizzato));

		assertThat(relazioni.get(sospesoAmico.getId()))
				.isEqualTo(new RelazioneAmicizia(StatoAmiciziaVista.AMICI, rigaAmico.getId(), chatAmico.getId()));
		assertThat(relazioni.get(sospesoInAttesa.getId())).isEqualTo(RelazioneAmicizia.NON_DISPONIBILE);
		assertThat(relazioni.get(anonimizzato.getId())).isEqualTo(RelazioneAmicizia.NON_DISPONIBILE);
	}

	@Test
	void relazioni_soloLeRigheDiChiChiede() {
		// La riga fra Luigi e il proprietario non riguarda Mario: per lui restano NESSUNA.
		riga(luigi, proprietario, StatoAmicizia.ACCETTATA, null, false);

		Map<UUID, RelazioneAmicizia> relazioni =
				amiciziaService.relazioni(mario.getId(), List.of(luigi, proprietario));

		assertThat(relazioni.get(luigi.getId())).isEqualTo(RelazioneAmicizia.NESSUNA);
		assertThat(relazioni.get(proprietario.getId())).isEqualTo(RelazioneAmicizia.NESSUNA);
		assertThat(amiciziaService.relazioni(mario.getId(), List.of())).isEmpty();
	}

	// --- Supporto ---

	private Chat chat(Amicizia amicizia) {
		Chat chat = new Chat();
		chat.setAmicizia(amicizia);
		chat.setCreataIl(Instant.now());
		return chatRepository.save(chat);
	}

	private NotificaAmicizia notifica(Amicizia amicizia, Utente destinatario, TipoNotificaAmicizia tipo) {
		NotificaAmicizia notifica = new NotificaAmicizia();
		notifica.setDestinatario(destinatario);
		notifica.setAmicizia(amicizia);
		notifica.setTipo(tipo);
		notifica.setCreataIl(Instant.now());
		return notificaAmiciziaRepository.save(notifica);
	}

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
