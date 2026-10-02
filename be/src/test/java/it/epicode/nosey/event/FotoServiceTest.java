package it.epicode.nosey.event;

import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Copertina: cambio (ModificaFoto) e cancellazione (CancellaFoto), progettazione v4 sezione 4. BE1-22.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class FotoServiceTest {

	@Autowired
	private FotoService fotoService;
	@Autowired
	private FotoEventoRepository fotoEventoRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@Autowired
	private EntityManager entityManager;

	private Utente proprietario;
	private Evento evento;

	@BeforeEach
	void prepara() {
		proprietario = utente();
		evento = evento();
	}

	// --- ModificaFoto: cambio copertina ---

	@Test
	void cambioCopertinaToglieQuellaPrecedente() {
		FotoResponse prima = carica();
		FotoResponse seconda = carica();
		assertThat(prima.copertina()).isTrue();
		assertThat(seconda.copertina()).isFalse();

		FotoResponse risposta = fotoService.modifica(evento.getId(), seconda.id(), proprietario.getId(),
				new ModificaFotoRequest(null, true));

		// azzeraCopertina e' un UPDATE bulk (flushAutomatically): aggiorna subito il DB, ma il
		// setCopertina(true) sulla foto scelta resta solo in memoria finche' non si fa il flush;
		// clear() da solo lo perderebbe (non sincronizza i cambi non ancora inviati).
		entityManager.flush();
		entityManager.clear();

		assertThat(risposta.copertina()).isTrue();
		assertThat(fotoEventoRepository.findById(prima.id())).get().extracting(FotoEvento::isCopertina).isEqualTo(false);
		assertThat(fotoEventoRepository.findById(seconda.id())).get().extracting(FotoEvento::isCopertina).isEqualTo(true);
	}

	@Test
	void unaSolaCopertinaAllaVolta() {
		carica();
		carica();
		carica();

		long numeroCopertine = fotoEventoRepository.findByEventoIdOrderByCopertinaDescCaricataIlAsc(evento.getId())
				.stream().filter(FotoEvento::isCopertina).count();

		assertThat(numeroCopertine).isEqualTo(1);
	}

	// --- CancellaFoto: la copertina passa alla foto rimasta piu' vecchia ---

	@Test
	void cancellaLaCopertinaLaPassaAllaFotoPiuVecchiaRimasta() {
		FotoResponse copertina = carica();
		FotoResponse altra = carica();

		fotoService.cancella(evento.getId(), copertina.id(), proprietario.getId());

		assertThat(fotoEventoRepository.findById(copertina.id())).isEmpty();
		assertThat(fotoEventoRepository.findById(altra.id())).get().extracting(FotoEvento::isCopertina).isEqualTo(true);
	}

	@Test
	void cancellaUnaFotoNonCopertinaLasciaInvariataLaCopertina() {
		FotoResponse copertina = carica();
		FotoResponse altra = carica();

		fotoService.cancella(evento.getId(), altra.id(), proprietario.getId());

		assertThat(fotoEventoRepository.findById(altra.id())).isEmpty();
		assertThat(fotoEventoRepository.findById(copertina.id())).get().extracting(FotoEvento::isCopertina).isEqualTo(true);
	}

	@Test
	void cancellaLUnicaFotoNonLasciaNessunaCopertina() {
		FotoResponse unica = carica();

		fotoService.cancella(evento.getId(), unica.id(), proprietario.getId());

		assertThat(fotoEventoRepository.findByEventoIdOrderByCopertinaDescCaricataIlAsc(evento.getId())).isEmpty();
	}

	// --- Supporto ---

	private FotoResponse carica() {
		MockMultipartFile file = new MockMultipartFile("file", "foto.png", "image/png", pngMinimo());
		return fotoService.crea(evento.getId(), proprietario.getId(), file, null);
	}

	private static byte[] pngMinimo() {
		return new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A };
	}

	private Evento evento() {
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
		utente.setNome("Anna");
		utente.setCognome("Bianchi");
		utente.setVerificato(true);
		utente.setCreatoIl(Instant.now());
		return utenteRepository.save(utente);
	}
}
