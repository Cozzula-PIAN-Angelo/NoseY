package it.epicode.nosey.ticket;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * IscrizioneEvento (progettazione v4, sezioni 2 e 7): iscrizione doppia e limite giornaliero. BE1-22.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class PartecipanteServiceTest {

	private static final int LIMITE_ISCRIZIONI_GIORNALIERO = 20; // app.limiti.iscrizioni (application.yml)

	@Autowired
	private PartecipanteService partecipanteService;
	@Autowired
	private PartecipanteRepository partecipanteRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;

	private Utente partecipante;

	@BeforeEach
	void prepara() {
		partecipante = utente();
	}

	@Test
	void iscrizioneDoppia409GiaIscritto() {
		Evento evento = evento(utente());
		partecipanteService.iscrivi(evento.getId(), partecipante.getId());

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> partecipanteService.iscrivi(evento.getId(), partecipante.getId()));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.GIA_ISCRITTO);
		assertThat(partecipanteRepository.countByEventoId(evento.getId())).isEqualTo(1);
	}

	@Test
	void limiteGiornalieroIscrizioni429() {
		Utente proprietario = utente();
		for (int i = 0; i < LIMITE_ISCRIZIONI_GIORNALIERO; i++) {
			Evento evento = evento(proprietario);
			partecipanteService.iscrivi(evento.getId(), partecipante.getId());
		}
		Evento unoDiTroppo = evento(proprietario);

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> partecipanteService.iscrivi(unoDiTroppo.getId(), partecipante.getId()));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.TROPPE_RICHIESTE);
		assertThat(partecipanteRepository.existsByEventoIdAndUtenteId(unoDiTroppo.getId(), partecipante.getId())).isFalse();
	}

	// --- Supporto ---

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

	private Utente utente() {
		Utente utente = new Utente();
		utente.setRuolo(ruoloRepository.findByNome("USER").orElseThrow());
		utente.setEmail("test-" + UUID.randomUUID() + "@nosey.test");
		utente.setPasswordHash("non-usata");
		utente.setNome("Mario");
		utente.setCognome("Rossi");
		utente.setVerificato(true);
		utente.setCreatoIl(Instant.now());
		return utenteRepository.save(utente);
	}
}
