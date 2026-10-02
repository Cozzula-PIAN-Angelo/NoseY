package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
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
 * RimuoviFotoModerazione, AnnullaEventoModerazione (progettazione v4, sezione 12).
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class AdminEventoTest {

	@Autowired
	private AdminEventoService adminEventoService;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private FotoEventoRepository fotoEventoRepository;
	@Autowired
	private NotificaEventoRepository notificaEventoRepository;
	@Autowired
	private PartecipanteRepository partecipanteRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;

	private Utente admin;
	private Utente proprietario;
	private Evento evento;

	@BeforeEach
	void prepara() {
		admin = utente("ADMIN", "Admin", "Uno");
		proprietario = utente("USER", "Anna", "Bianchi");
		evento = evento(proprietario, Instant.now().plus(Duration.ofDays(7)), Instant.now().plus(Duration.ofDays(8)));
	}

	// --- RimuoviFotoModerazione ---

	@Test
	void rimuoveLaFotoENotificaIlProprietario() {
		FotoEvento copertina = foto(evento, true, Instant.now().minus(Duration.ofMinutes(10)));
		FotoEvento altra = foto(evento, false, Instant.now());

		adminEventoService.rimuoviFoto(evento.getId(), copertina.getId(), admin.getId());

		assertThat(fotoEventoRepository.findById(copertina.getId())).isEmpty();
		assertThat(fotoEventoRepository.findById(altra.getId())).get().extracting(FotoEvento::isCopertina).isEqualTo(true);
		assertThat(moderazione()).extracting(NotificaEvento::getDestinatario)
				.extracting(Utente::getId).containsExactly(proprietario.getId());
	}

	@Test
	void rimuoviFotoEventoInesistente404() {
		assertErrore(CodiceErrore.NON_TROVATO,
				() -> adminEventoService.rimuoviFoto(UUID.randomUUID(), UUID.randomUUID(), admin.getId()));
	}

	@Test
	void rimuoviFotoInesistente404() {
		assertErrore(CodiceErrore.NON_TROVATO,
				() -> adminEventoService.rimuoviFoto(evento.getId(), UUID.randomUUID(), admin.getId()));
		assertThat(moderazione()).isEmpty();
	}

	@Test
	void rimuoviFotoDiUnAltroEvento404() {
		Evento altroEvento = evento(proprietario, Instant.now().plus(Duration.ofDays(7)), Instant.now().plus(Duration.ofDays(8)));
		FotoEvento fotoAltroEvento = foto(altroEvento, true, Instant.now());

		assertErrore(CodiceErrore.NON_TROVATO,
				() -> adminEventoService.rimuoviFoto(evento.getId(), fotoAltroEvento.getId(), admin.getId()));
	}

	@Test
	void rimuoviFotoSuUnAltroAdmin403() {
		Utente altroAdmin = utente("ADMIN", "Admin", "Due");
		Evento eventoAltroAdmin = evento(altroAdmin, Instant.now().plus(Duration.ofDays(7)), Instant.now().plus(Duration.ofDays(8)));
		FotoEvento fotoAltroAdmin = foto(eventoAltroAdmin, true, Instant.now());

		assertErrore(CodiceErrore.RUOLO_INSUFFICIENTE,
				() -> adminEventoService.rimuoviFoto(eventoAltroAdmin.getId(), fotoAltroAdmin.getId(), admin.getId()));
		assertThat(fotoEventoRepository.findById(fotoAltroAdmin.getId())).isPresent();
	}

	@Test
	void rimuoviFotoSuSeStesso403() {
		Evento eventoDiAdmin = evento(admin, Instant.now().plus(Duration.ofDays(7)), Instant.now().plus(Duration.ofDays(8)));
		FotoEvento fotoPropria = foto(eventoDiAdmin, true, Instant.now());

		assertErrore(CodiceErrore.RUOLO_INSUFFICIENTE,
				() -> adminEventoService.rimuoviFoto(eventoDiAdmin.getId(), fotoPropria.getId(), admin.getId()));
	}

	@Test
	void rimuoviFotoValeAncheSuEventoConcluso() {
		Evento concluso = evento(proprietario, Instant.now().minus(Duration.ofDays(3)), Instant.now().minus(Duration.ofDays(2)));
		FotoEvento fotoConclusa = foto(concluso, true, Instant.now());

		adminEventoService.rimuoviFoto(concluso.getId(), fotoConclusa.getId(), admin.getId());

		assertThat(fotoEventoRepository.findById(fotoConclusa.getId())).isEmpty();
	}

	@Test
	void rimuoviFotoValeAncheSuEventoAnnullato() {
		evento.setStato(StatoEventoDb.ANNULLATO);
		FotoEvento fotoAnnullato = foto(evento, true, Instant.now());

		adminEventoService.rimuoviFoto(evento.getId(), fotoAnnullato.getId(), admin.getId());

		assertThat(fotoEventoRepository.findById(fotoAnnullato.getId())).isEmpty();
	}

	// --- AnnullaEventoModerazione ---

	@Test
	void annullaConMotivoNotificaProprietarioEPartecipanti() {
		Utente partecipante = utente("USER", "Mario", "Rossi");
		iscrivi(evento, partecipante);

		adminEventoService.annulla(evento.getId(), "Contenuti non adeguati", admin.getId());

		Evento aggiornato = eventoRepository.findById(evento.getId()).orElseThrow();
		assertThat(aggiornato.getStato()).isEqualTo(StatoEventoDb.ANNULLATO);
		assertThat(aggiornato.getMotivoAnnullamento()).isEqualTo("Contenuti non adeguati");
		assertThat(moderazione()).extracting(NotificaEvento::getDestinatario)
				.extracting(Utente::getId).containsExactly(proprietario.getId());
		assertThat(annullamento()).extracting(NotificaEvento::getDestinatario)
				.extracting(Utente::getId).containsExactly(partecipante.getId());
	}

	@Test
	void annullaEventoInesistente404() {
		assertErrore(CodiceErrore.NON_TROVATO,
				() -> adminEventoService.annulla(UUID.randomUUID(), "Motivo", admin.getId()));
	}

	@Test
	void annullaSuUnAltroAdmin403() {
		Utente altroAdmin = utente("ADMIN", "Admin", "Due");
		Evento eventoAltroAdmin = evento(altroAdmin, Instant.now().plus(Duration.ofDays(7)), Instant.now().plus(Duration.ofDays(8)));

		assertErrore(CodiceErrore.RUOLO_INSUFFICIENTE,
				() -> adminEventoService.annulla(eventoAltroAdmin.getId(), "Motivo", admin.getId()));
		assertThat(eventoRepository.findById(eventoAltroAdmin.getId())).get()
				.extracting(Evento::getStato).isEqualTo(StatoEventoDb.PROGRAMMATO);
	}

	@Test
	void annullaEventoConcluso409() {
		evento.setDataEvento(Instant.now().minus(Duration.ofDays(3)));
		evento.setDataFine(Instant.now().minus(Duration.ofDays(2)));

		assertErrore(CodiceErrore.EVENTO_CONCLUSO, () -> adminEventoService.annulla(evento.getId(), "Motivo", admin.getId()));
	}

	@Test
	void annullaEventoGiaAnnullato409() {
		evento.setStato(StatoEventoDb.ANNULLATO);

		assertErrore(CodiceErrore.EVENTO_ANNULLATO, () -> adminEventoService.annulla(evento.getId(), "Motivo", admin.getId()));
	}

	// --- Supporto ---

	private List<NotificaEvento> moderazione() {
		return notificaEventoRepository.findByEventoIdAndTipoAndLettaFalse(evento.getId(), TipoNotificaEvento.MODERAZIONE);
	}

	private List<NotificaEvento> annullamento() {
		return notificaEventoRepository.findByEventoIdAndTipoAndLettaFalse(evento.getId(), TipoNotificaEvento.ANNULLAMENTO);
	}

	private void assertErrore(CodiceErrore atteso, Executable azione) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, azione);
		assertThat(ex.getCodiceErrore()).isEqualTo(atteso);
	}

	private void iscrivi(Evento evento, Utente utente) {
		Partecipante partecipante = new Partecipante();
		partecipante.setUtente(utente);
		partecipante.setEvento(evento);
		partecipante.setCodice(UUID.randomUUID());
		partecipante.setEmessoIl(Instant.now());
		partecipanteRepository.save(partecipante);
	}

	private FotoEvento foto(Evento evento, boolean copertina, Instant caricataIl) {
		FotoEvento foto = new FotoEvento();
		foto.setEvento(evento);
		foto.setContenuto(new byte[] { 1, 2, 3 });
		foto.setContentType("image/png");
		foto.setCopertina(copertina);
		foto.setCaricataIl(caricataIl);
		return fotoEventoRepository.save(foto);
	}

	private Evento evento(Utente proprietario, Instant dataEvento, Instant dataFine) {
		Evento evento = new Evento();
		evento.setProprietario(proprietario);
		evento.setTitolo("Concerto al parco");
		evento.setDataEvento(dataEvento);
		evento.setDataFine(dataFine);
		evento.setLat(45.07);
		evento.setLng(7.69);
		evento.setCreatoIl(Instant.now());
		return eventoRepository.save(evento);
	}

	private Utente utente(String ruolo, String nome, String cognome) {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome(ruolo).orElseThrow());
		utente.setEmail("test-" + UUID.randomUUID() + "@nosey.test");
		utente.setPasswordHash("non-usata");
		utente.setNome(nome);
		utente.setCognome(cognome);
		utente.setVerificato(true);
		utente.setCreatoIl(Instant.now());
		return utenteRepository.save(utente);
	}
}
