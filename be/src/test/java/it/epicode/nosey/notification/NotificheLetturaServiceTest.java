package it.epicode.nosey.notification;

import it.epicode.nosey.chat.Chat;
import it.epicode.nosey.chat.ChatRepository;
import it.epicode.nosey.chat.Messaggio;
import it.epicode.nosey.chat.MessaggioRepository;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.PaginaResponse;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.friendship.AmiciziaRepository;
import it.epicode.nosey.friendship.StatoAmicizia;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import jakarta.persistence.EntityManager;
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
 * Lettura delle notifiche (progettazione v4, sezione 10): liste dalla piu' recente e solo le proprie,
 * testi generati con il nome attuale, ContaNonLette, SegnaNotificaLetta e SegnaTutteLette con i loro
 * errori. Per chats la lettura segna anche i messaggi, come SegnaChatLetta.
 * Test di integrazione sul database locale (decisione 10): ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class NotificheLetturaServiceTest {

	private static final Instant T0 = Instant.parse("2026-09-01T10:00:00Z");

	@Autowired
	private NotificheLetturaService notificheLetturaService;
	@Autowired
	private NotificaEventoRepository notificaEventoRepository;
	@Autowired
	private NotificaAmiciziaRepository notificaAmiciziaRepository;
	@Autowired
	private NotificaChatRepository notificaChatRepository;
	@Autowired
	private ChatRepository chatRepository;
	@Autowired
	private MessaggioRepository messaggioRepository;
	@Autowired
	private AmiciziaRepository amiciziaRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private EntityManager entityManager;

	private Utente mario;
	private Utente luigi;
	private Utente anna;
	private Evento evento;

	@BeforeEach
	void prepara() {
		mario = utente("Mario", "Rossi");
		luigi = utente("Luigi", "Verdi");
		anna = utente("Anna", "Bianchi");
		evento = evento(anna);
	}

	// --- Liste ---

	@Test
	void listaEventi_soloLeProprie_dallaPiuRecente_paginata() {
		NotificaEvento prima = notificaEvento(mario, T0);
		NotificaEvento seconda = notificaEvento(mario, T0.plusSeconds(1));
		NotificaEvento terza = notificaEvento(mario, T0.plusSeconds(2));
		notificaEvento(luigi, T0.plusSeconds(3));

		PaginaResponse<NotificaResponse> pagina0 = notificheLetturaService.listaEventi(mario.getId(), 0, 2);
		PaginaResponse<NotificaResponse> pagina1 = notificheLetturaService.listaEventi(mario.getId(), 1, 2);

		assertThat(pagina0.contenuto()).extracting(NotificaResponse::id).containsExactly(terza.getId(), seconda.getId());
		assertThat(pagina1.contenuto()).extracting(NotificaResponse::id).containsExactly(prima.getId());
		assertThat(pagina0.totaleElementi()).isEqualTo(3);
		assertThat(pagina0.totalePagine()).isEqualTo(2);
		assertThat(pagina0.contenuto().getFirst()).satisfies(n -> {
			assertThat(n.categoria()).isEqualTo(CategoriaNotifica.EVENTS);
			assertThat(n.tipo()).isEqualTo("MANUALE");
			assertThat(n.riferimentoId()).isEqualTo(evento.getId());
			assertThat(n.letta()).isFalse();
		});
	}

	@Test
	void listaAmicizie_testoConIlNomeAttualeDellAltro() {
		Amicizia amicizia = amicizia(luigi, mario, StatoAmicizia.PENDENTE);
		notificaAmicizia(mario, amicizia, TipoNotificaAmicizia.RICHIESTA, T0);
		notificaAmicizia(luigi, amicizia, TipoNotificaAmicizia.ACCETTATA, T0);
		luigi.setNome("Luigino");
		utenteRepository.saveAndFlush(luigi);
		entityManager.clear();

		PaginaResponse<NotificaResponse> pagina = notificheLetturaService.listaAmicizie(mario.getId(), 0, 20);

		assertThat(pagina.contenuto()).singleElement().satisfies(n -> {
			assertThat(n.categoria()).isEqualTo(CategoriaNotifica.FRIENDSHIPS);
			assertThat(n.tipo()).isEqualTo("RICHIESTA");
			assertThat(n.testo()).isEqualTo("Luigino Verdi ti ha chiesto l'amicizia");
			assertThat(n.riferimentoId()).isEqualTo(amicizia.getId());
		});
	}

	@Test
	void listaChat_soloLeProprieNonLette_dallaPiuRecente() {
		Utente paolo = utente("Paolo", "Neri");
		Chat conLuigi = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA));
		Chat conAnna = chat(amicizia(anna, mario, StatoAmicizia.ACCETTATA));
		Chat conPaolo = chat(amicizia(mario, paolo, StatoAmicizia.ACCETTATA));
		NotificaChat daLuigi = notificaChat(mario, conLuigi, T0, false);
		NotificaChat daAnna = notificaChat(mario, conAnna, T0.plusSeconds(5), false);
		notificaChat(mario, conPaolo, T0.plusSeconds(9), true);
		notificaChat(luigi, conLuigi, T0.plusSeconds(9), false);

		List<NotificaResponse> lista = notificheLetturaService.listaChat(mario.getId());

		assertThat(lista).extracting(NotificaResponse::id).containsExactly(daAnna.getId(), daLuigi.getId());
		assertThat(lista.getFirst()).satisfies(n -> {
			assertThat(n.categoria()).isEqualTo(CategoriaNotifica.CHATS);
			assertThat(n.tipo()).isEqualTo("NUOVI_MESSAGGI");
			assertThat(n.testo()).isEqualTo("Nuovi messaggi da Anna Bianchi");
			assertThat(n.riferimentoId()).isEqualTo(conAnna.getId());
			assertThat(n.creataIl()).isEqualTo(T0.plusSeconds(5));
		});
	}

	// --- ContaNonLette ---

	@Test
	void contaNonLette_soloLeNonLetteProprie_perCategoria() {
		notificaEvento(mario, T0);
		notificaEvento(mario, T0.plusSeconds(1));
		notificaEvento(mario, T0.plusSeconds(2)).setLetta(true);
		notificaEvento(luigi, T0);
		notificaAmicizia(mario, amicizia(luigi, mario, StatoAmicizia.PENDENTE), TipoNotificaAmicizia.RICHIESTA, T0);
		notificaChat(mario, chat(amicizia(mario, anna, StatoAmicizia.ACCETTATA)), T0, false);

		Map<String, Long> conteggi = notificheLetturaService.contaNonLette(mario.getId());

		assertThat(conteggi).containsExactly(Map.entry("events", 2L), Map.entry("friendships", 1L),
				Map.entry("chats", 1L));
	}

	// --- SegnaNotificaLetta ---

	@Test
	void segnaLetta_eventsEFriendships_soloQuellaNotifica() {
		NotificaEvento daLeggere = notificaEvento(mario, T0);
		NotificaEvento altra = notificaEvento(mario, T0.plusSeconds(1));
		NotificaAmicizia richiesta = notificaAmicizia(mario, amicizia(luigi, mario, StatoAmicizia.PENDENTE),
				TipoNotificaAmicizia.RICHIESTA, T0);

		notificheLetturaService.segnaLetta("events", daLeggere.getId(), mario.getId());
		notificheLetturaService.segnaLetta("friendships", richiesta.getId(), mario.getId());
		entityManager.flush();
		entityManager.clear();

		assertThat(notificaEventoRepository.findById(daLeggere.getId()).orElseThrow().isLetta()).isTrue();
		assertThat(notificaEventoRepository.findById(altra.getId()).orElseThrow().isLetta()).isFalse();
		assertThat(notificaAmiciziaRepository.findById(richiesta.getId()).orElseThrow().isLetta()).isTrue();
		assertThat(notificheLetturaService.contaNonLette(mario.getId()))
				.containsEntry("events", 1L).containsEntry("friendships", 0L);
	}

	@Test
	void segnaLetta_chats_segnaAncheIMessaggiDellAltro() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA));
		Messaggio diLuigi = messaggio(chat, luigi, T0);
		Messaggio diMario = messaggio(chat, mario, T0.plusSeconds(1));
		NotificaChat notifica = notificaChat(mario, chat, T0, false);

		notificheLetturaService.segnaLetta("chats", notifica.getId(), mario.getId());
		entityManager.clear();

		assertThat(notificaChatRepository.findById(notifica.getId()).orElseThrow().isLetta()).isTrue();
		assertThat(messaggioRepository.findById(diLuigi.getId()).orElseThrow().isLetto()).isTrue();
		assertThat(messaggioRepository.findById(diMario.getId()).orElseThrow().isLetto()).isFalse();
		assertThat(notificheLetturaService.contaNonLette(mario.getId())).containsEntry("chats", 0L);
	}

	@Test
	void segnaLetta_errori() {
		NotificaEvento diLuigi = notificaEvento(luigi, T0);
		NotificaEvento diMario = notificaEvento(mario, T0);

		// Una notifica di un altro utente e' 404 come una inesistente.
		assertErrore(CodiceErrore.NON_TROVATO,
				() -> notificheLetturaService.segnaLetta("events", diLuigi.getId(), mario.getId()));
		assertErrore(CodiceErrore.NON_TROVATO,
				() -> notificheLetturaService.segnaLetta("events", UUID.randomUUID(), mario.getId()));
		// La categoria dice in quale tabella cercare: un id di events in friendships non esiste.
		assertErrore(CodiceErrore.NON_TROVATO,
				() -> notificheLetturaService.segnaLetta("friendships", diMario.getId(), mario.getId()));
		assertErrore(CodiceErrore.NON_TROVATO,
				() -> notificheLetturaService.segnaLetta("chats", diMario.getId(), mario.getId()));
		assertErrore(CodiceErrore.CATEGORIA_NON_VALIDA,
				() -> notificheLetturaService.segnaLetta("altro", diMario.getId(), mario.getId()));
		assertErrore(CodiceErrore.CATEGORIA_NON_VALIDA,
				() -> notificheLetturaService.segnaLetta("EVENTS", diMario.getId(), mario.getId()));
	}

	// --- SegnaTutteLette ---

	@Test
	void segnaTutteLette_senzaCategoria_iContatoriTornanoAZero() {
		Amicizia conLuigi = amicizia(mario, luigi, StatoAmicizia.ACCETTATA);
		Chat chat = chat(conLuigi);
		Chat inSolaLettura = chat(amicizia(anna, mario, StatoAmicizia.RIMOSSA));
		Messaggio diLuigi = messaggio(chat, luigi, T0);
		Messaggio diMario = messaggio(chat, mario, T0.plusSeconds(1));
		Messaggio diAnna = messaggio(inSolaLettura, anna, T0);
		notificaChat(mario, chat, T0, false);
		notificaChat(mario, inSolaLettura, T0, false);
		NotificaChat perLuigi = notificaChat(luigi, chat, T0, false);
		notificaEvento(mario, T0);
		notificaEvento(mario, T0.plusSeconds(1));
		NotificaEvento perLuigiEvento = notificaEvento(luigi, T0);
		notificaAmicizia(mario, conLuigi, TipoNotificaAmicizia.ACCETTATA, T0);

		notificheLetturaService.segnaTutteLette(null, mario.getId());
		entityManager.clear();

		assertThat(notificheLetturaService.contaNonLette(mario.getId())).containsExactly(
				Map.entry("events", 0L), Map.entry("friendships", 0L), Map.entry("chats", 0L));
		assertThat(messaggioRepository.findById(diLuigi.getId()).orElseThrow().isLetto()).isTrue();
		assertThat(messaggioRepository.findById(diAnna.getId()).orElseThrow().isLetto()).isTrue();
		// Le cose degli altri restano come sono.
		assertThat(messaggioRepository.findById(diMario.getId()).orElseThrow().isLetto()).isFalse();
		assertThat(notificaChatRepository.findById(perLuigi.getId()).orElseThrow().isLetta()).isFalse();
		assertThat(notificaEventoRepository.findById(perLuigiEvento.getId()).orElseThrow().isLetta()).isFalse();
	}

	@Test
	void segnaTutteLette_conCategoria_soloQuella() {
		Chat chat = chat(amicizia(mario, luigi, StatoAmicizia.ACCETTATA));
		Messaggio diLuigi = messaggio(chat, luigi, T0);
		notificaChat(mario, chat, T0, false);
		notificaEvento(mario, T0);
		notificaAmicizia(mario, amicizia(anna, mario, StatoAmicizia.PENDENTE), TipoNotificaAmicizia.RICHIESTA, T0);

		notificheLetturaService.segnaTutteLette("friendships", mario.getId());
		entityManager.clear();

		assertThat(notificheLetturaService.contaNonLette(mario.getId())).containsExactly(
				Map.entry("events", 1L), Map.entry("friendships", 0L), Map.entry("chats", 1L));
		assertThat(messaggioRepository.findById(diLuigi.getId()).orElseThrow().isLetto()).isFalse();

		notificheLetturaService.segnaTutteLette("chats", mario.getId());
		entityManager.clear();

		assertThat(notificheLetturaService.contaNonLette(mario.getId())).containsEntry("chats", 0L)
				.containsEntry("events", 1L);
		assertThat(messaggioRepository.findById(diLuigi.getId()).orElseThrow().isLetto()).isTrue();
	}

	@Test
	void segnaTutteLette_categoriaNonValida() {
		notificaEvento(mario, T0);

		assertErrore(CodiceErrore.CATEGORIA_NON_VALIDA,
				() -> notificheLetturaService.segnaTutteLette("", mario.getId()));
		assertErrore(CodiceErrore.CATEGORIA_NON_VALIDA,
				() -> notificheLetturaService.segnaTutteLette("tutte", mario.getId()));
		assertThat(notificheLetturaService.contaNonLette(mario.getId())).containsEntry("events", 1L);
	}

	// --- Supporto ---

	private void assertErrore(CodiceErrore codice, Executable chiamata) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, chiamata);
		assertThat(ex.getCodiceErrore()).isEqualTo(codice);
	}

	private NotificaEvento notificaEvento(Utente destinatario, Instant creataIl) {
		NotificaEvento notifica = new NotificaEvento();
		notifica.setDestinatario(destinatario);
		notifica.setEvento(evento);
		notifica.setTipo(TipoNotificaEvento.MANUALE);
		notifica.setTesto("Ci vediamo all'ingresso");
		notifica.setCreataIl(creataIl);
		return notificaEventoRepository.saveAndFlush(notifica);
	}

	private NotificaAmicizia notificaAmicizia(Utente destinatario, Amicizia amicizia, TipoNotificaAmicizia tipo,
			Instant creataIl) {
		NotificaAmicizia notifica = new NotificaAmicizia();
		notifica.setDestinatario(destinatario);
		notifica.setAmicizia(amicizia);
		notifica.setTipo(tipo);
		notifica.setCreataIl(creataIl);
		return notificaAmiciziaRepository.saveAndFlush(notifica);
	}

	private NotificaChat notificaChat(Utente destinatario, Chat chat, Instant aggiornataIl, boolean letta) {
		NotificaChat notifica = new NotificaChat();
		notifica.setDestinatario(destinatario);
		notifica.setChat(chat);
		notifica.setLetta(letta);
		notifica.setAggiornataIl(aggiornataIl);
		return notificaChatRepository.saveAndFlush(notifica);
	}

	private Messaggio messaggio(Chat chat, Utente mittente, Instant inviatoIl) {
		Messaggio messaggio = new Messaggio();
		messaggio.setChat(chat);
		messaggio.setMittente(mittente);
		messaggio.setTesto("ciao");
		messaggio.setInviatoIl(inviatoIl);
		return messaggioRepository.saveAndFlush(messaggio);
	}

	private Chat chat(Amicizia amicizia) {
		Chat chat = new Chat();
		chat.setAmicizia(amicizia);
		chat.setCreataIl(T0);
		return chatRepository.saveAndFlush(chat);
	}

	private Amicizia amicizia(Utente richiedente, Utente ricevente, StatoAmicizia stato) {
		Amicizia amicizia = new Amicizia();
		amicizia.setRichiedente(richiedente);
		amicizia.setRicevente(ricevente);
		amicizia.setEvento(evento);
		amicizia.setStato(stato);
		if (stato == StatoAmicizia.RIMOSSA) {
			amicizia.setChiusaDa(ricevente);
		}
		amicizia.setCreataIl(T0);
		amicizia.setAggiornataIl(T0);
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
}
