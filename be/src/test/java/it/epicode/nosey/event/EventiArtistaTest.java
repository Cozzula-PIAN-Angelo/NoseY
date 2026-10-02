package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
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
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * EventiArtista (progettazione v4, sezione 6): le "prossime date" nella scheda artista.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class EventiArtistaTest {

	@Autowired
	private ArtistaService artistaService;
	@Autowired
	private ArtistaRepository artistaRepository;
	@Autowired
	private ArtistaEventoRepository artistaEventoRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;

	private Utente proprietario;
	private Artista artista;

	@BeforeEach
	void prepara() {
		proprietario = utente();
		artista = artista("Vasco Rossi " + UUID.randomUUID());
	}

	@Test
	void artistaInesistente404() {
		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> artistaService.eventi(UUID.randomUUID()));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.NON_TROVATO);
	}

	@Test
	void senzaEventiListaVuota() {
		assertThat(artistaService.eventi(artista.getId())).isEmpty();
	}

	@Test
	void restituisceProgrammatoEInCorsoPerDataEventoCrescente() {
		Evento traSetteGiorni = evento(Instant.now().plus(Duration.ofDays(7)), Instant.now().plus(Duration.ofDays(8)));
		Evento inCorso = evento(Instant.now().minus(Duration.ofHours(1)), Instant.now().plus(Duration.ofHours(3)));
		associa(traSetteGiorni, artista);
		associa(inCorso, artista);

		List<EventoMappaResponse> eventi = artistaService.eventi(artista.getId());

		assertThat(eventi).extracting(EventoMappaResponse::id)
				.containsExactly(inCorso.getId(), traSetteGiorni.getId());
		assertThat(eventi).extracting(EventoMappaResponse::stato)
				.containsExactly(StatoEvento.IN_CORSO, StatoEvento.PROGRAMMATO);
	}

	@Test
	void escludeEventoConcluso() {
		Evento concluso = evento(Instant.now().minus(Duration.ofDays(3)), Instant.now().minus(Duration.ofDays(2)));
		associa(concluso, artista);

		assertThat(artistaService.eventi(artista.getId())).isEmpty();
	}

	@Test
	void escludeEventoAnnullato() {
		Evento annullato = evento(Instant.now().plus(Duration.ofDays(7)), Instant.now().plus(Duration.ofDays(8)));
		annullato.setStato(StatoEventoDb.ANNULLATO);
		associa(annullato, artista);

		assertThat(artistaService.eventi(artista.getId())).isEmpty();
	}

	@Test
	void valeAncheSeLArtistaEDisattivato() {
		Evento evento = evento(Instant.now().plus(Duration.ofDays(7)), Instant.now().plus(Duration.ofDays(8)));
		associa(evento, artista);
		artista.setAttivo(false);

		assertThat(artistaService.eventi(artista.getId())).extracting(EventoMappaResponse::id)
				.containsExactly(evento.getId());
	}

	// --- Supporto ---

	private void associa(Evento evento, Artista artista) {
		ArtistaEvento artistaEvento = new ArtistaEvento();
		artistaEvento.setEvento(evento);
		artistaEvento.setArtista(artista);
		artistaEventoRepository.save(artistaEvento);
	}

	private Artista artista(String nome) {
		Artista artista = new Artista();
		artista.setNome(nome);
		return artistaRepository.save(artista);
	}

	private Evento evento(Instant dataEvento, Instant dataFine) {
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
