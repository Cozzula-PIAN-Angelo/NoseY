package it.epicode.nosey.ticket;

import it.epicode.nosey.chat.Chat;
import it.epicode.nosey.chat.ChatRepository;
import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.friendship.AmiciziaRepository;
import it.epicode.nosey.friendship.StatoAmicizia;
import it.epicode.nosey.friendship.StatoAmiciziaVista;
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
 * ListaPartecipanti (progettazione v4, sezione 7; decisione 20 per chatId): accesso, ordine e, per
 * ogni persona, lo stato di amicizia visto da chi chiede (le regole complete di statoAmicizia sono in
 * AmiciziaServiceTest).
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class ListaPartecipantiTest {

	@Autowired
	private PartecipanteService partecipanteService;
	@Autowired
	private PartecipanteRepository partecipanteRepository;
	@Autowired
	private AmiciziaRepository amiciziaRepository;
	@Autowired
	private ChatRepository chatRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;

	private Utente proprietario;
	private Utente mario;
	private Utente luigi;
	private Utente peach;
	private Evento evento;

	@BeforeEach
	void prepara() {
		proprietario = utente("Anna", "Bianchi");
		mario = utente("Mario", "Rossi");
		luigi = utente("Luigi", "Verdi");
		peach = utente("Peach", "Neri");
		evento = evento(proprietario);
		Instant prima = Instant.now().minus(Duration.ofHours(3));
		iscrivi(luigi, prima);
		iscrivi(mario, prima.plus(Duration.ofHours(1)));
		iscrivi(peach, prima.plus(Duration.ofHours(2)));
	}

	// --- Accesso ---

	@Test
	void eventoInesistente404() {
		assertErrore(CodiceErrore.NON_TROVATO, () -> partecipanteService.lista(UUID.randomUUID(), mario.getId()));
	}

	@Test
	void senzaTicket403() {
		Utente estraneo = utente("Toad", "Gialli");
		assertErrore(CodiceErrore.NESSUN_TICKET, () -> lista(estraneo));
	}

	// --- Ordine ---

	@Test
	void ilPartecipanteVedeIlProprietarioInCimaPoiGliAltriPerEmissioneSenzaSeStesso() {
		List<PartecipanteResponse> lista = lista(mario);

		assertThat(lista).extracting(p -> p.utente().id())
				.containsExactly(proprietario.getId(), luigi.getId(), peach.getId());
		assertThat(lista).extracting(PartecipanteResponse::proprietario).containsExactly(true, false, false);
	}

	@Test
	void ilProprietarioSenzaTicketVedeSoloIPartecipanti() {
		List<PartecipanteResponse> lista = lista(proprietario);

		assertThat(lista).extracting(p -> p.utente().id())
				.containsExactly(luigi.getId(), mario.getId(), peach.getId());
		assertThat(lista).extracting(PartecipanteResponse::proprietario).containsOnly(false);
	}

	// --- statoAmicizia per ogni persona ---

	@Test
	void senzaAmicizieTuttiNessuna() {
		assertThat(lista(mario)).allSatisfy(p -> {
			assertThat(p.statoAmicizia()).isEqualTo(StatoAmiciziaVista.NESSUNA);
			assertThat(p.amiciziaId()).isNull();
			assertThat(p.chatId()).isNull();
		});
	}

	@Test
	void ogniPersonaConIlSuoStatoDiAmicizia() {
		Amicizia conProprietario = riga(proprietario, mario, StatoAmicizia.ACCETTATA, null);
		Chat chat = chat(conProprietario);
		Amicizia conLuigi = riga(mario, luigi, StatoAmicizia.PENDENTE, null);
		Amicizia conPeach = riga(peach, mario, StatoAmicizia.PENDENTE, null);

		List<PartecipanteResponse> lista = lista(mario);

		assertThat(lista).extracting(PartecipanteResponse::statoAmicizia).containsExactly(
				StatoAmiciziaVista.AMICI, StatoAmiciziaVista.INVIATA, StatoAmiciziaVista.RICEVUTA);
		assertThat(lista).extracting(PartecipanteResponse::amiciziaId)
				.containsExactly(conProprietario.getId(), conLuigi.getId(), conPeach.getId());
		assertThat(lista.getFirst().chatId()).isEqualTo(chat.getId());
	}

	@Test
	void lAltroLatoVedeLoStatoSpeculare() {
		riga(mario, luigi, StatoAmicizia.PENDENTE, null);

		PartecipanteResponse marioVistoDaLuigi = lista(luigi).stream()
				.filter(p -> p.utente().id().equals(mario.getId()))
				.findFirst().orElseThrow();

		assertThat(marioVistoDaLuigi.statoAmicizia()).isEqualTo(StatoAmiciziaVista.RICEVUTA);
	}

	@Test
	void amiciziaRimossaDallAltroNonDisponibile() {
		riga(mario, luigi, StatoAmicizia.RIMOSSA, luigi);

		PartecipanteResponse luigiVisto = lista(mario).get(1);

		assertThat(luigiVisto.statoAmicizia()).isEqualTo(StatoAmiciziaVista.NON_DISPONIBILE);
		assertThat(luigiVisto.amiciziaId()).isNull();
		assertThat(luigiVisto.chatId()).isNull();
	}

	@Test
	void utenteSospesoNonDisponibileEInattivoMaLAmicoResta() {
		riga(mario, peach, StatoAmicizia.ACCETTATA, null);
		peach.setStato(StatoUtente.SOSPESO);
		luigi.setStato(StatoUtente.SOSPESO);
		utenteRepository.saveAndFlush(peach);
		utenteRepository.saveAndFlush(luigi);

		List<PartecipanteResponse> lista = lista(mario);

		assertThat(lista.get(1).utente().attivo()).isFalse();
		assertThat(lista.get(1).statoAmicizia()).isEqualTo(StatoAmiciziaVista.NON_DISPONIBILE);
		assertThat(lista.get(2).utente().attivo()).isFalse();
		assertThat(lista.get(2).statoAmicizia()).isEqualTo(StatoAmiciziaVista.AMICI);
	}

	// --- Supporto ---

	private List<PartecipanteResponse> lista(Utente chiChiede) {
		return partecipanteService.lista(evento.getId(), chiChiede.getId());
	}

	private void assertErrore(CodiceErrore atteso, Executable azione) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, azione);
		assertThat(ex.getCodiceErrore()).isEqualTo(atteso);
	}

	private Amicizia riga(Utente richiedente, Utente ricevente, StatoAmicizia stato, Utente chiusaDa) {
		Instant ieri = Instant.now().minus(Duration.ofDays(1));
		Amicizia amicizia = new Amicizia();
		amicizia.setRichiedente(richiedente);
		amicizia.setRicevente(ricevente);
		amicizia.setEvento(evento);
		amicizia.setStato(stato);
		amicizia.setChiusaDa(chiusaDa);
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

	private void iscrivi(Utente utente, Instant emessoIl) {
		Partecipante partecipante = new Partecipante();
		partecipante.setUtente(utente);
		partecipante.setEvento(evento);
		partecipante.setCodice(UUID.randomUUID());
		partecipante.setEmessoIl(emessoIl);
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
