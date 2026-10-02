package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * ModificaEvento (progettazione v4, sezione 3): le regole piu' facili da rompere, BE1-22.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class EventoServiceTest {

	@Autowired
	private EventoService eventoService;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private PoiRepository poiRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;

	private Utente proprietario;
	private Evento evento;

	@BeforeEach
	void prepara() {
		proprietario = utente();
		evento = evento(Instant.now().plus(Duration.ofDays(7)), Instant.now().plus(Duration.ofDays(8)));
	}

	// --- Date invariate su un evento in corso ---

	@Test
	void modificaDataEventoSuEventoInCorso409EventoGiaIniziato() {
		inCorso();

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> modifica(new ModificaEventoRequest(null, null, Instant.now().plus(Duration.ofDays(1)), null, null, null)));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.EVENTO_GIA_INIZIATO);
	}

	@Test
	void modificaConDataEventoInvariataSuEventoInCorsoNonDaErrore() {
		inCorso();
		Instant stessaData = evento.getDataEvento();

		EventoDettaglioResponse risposta = modifica(new ModificaEventoRequest(null, null, stessaData, null, null, null));

		assertThat(risposta.dataEvento()).isEqualTo(stessaData);
	}

	@Test
	void modificaTitoloSuEventoInCorsoFunzionaSenzaToccareLeDate() {
		inCorso();

		EventoDettaglioResponse risposta = modifica(new ModificaEventoRequest("Nuovo titolo", null, null, null, null, null));

		assertThat(risposta.titolo()).isEqualTo("Nuovo titolo");
	}

	// --- POI fuori raggio ---

	@Test
	void modificaPosizioneConPoiCheResterebbeFuoriRaggio409() {
		Poi poi = poi(evento, evento.getLat(), evento.getLng());
		// ~3.3 km a nord: oltre i 2 km consentiti (RAGGIO_POI_KM).
		double latLontana = evento.getLat() + 0.03;

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> modifica(new ModificaEventoRequest(null, null, null, null, latLontana, evento.getLng())));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.POI_FUORI_RAGGIO);
		assertThat(eventoRepository.findById(evento.getId())).get().extracting(Evento::getLat).isEqualTo(evento.getLat());
		assertThat(poiRepository.findById(poi.getId())).isPresent();
	}

	@Test
	void modificaPosizioneConPoiCheRestaEntroIlRaggioFunziona() {
		poi(evento, evento.getLat(), evento.getLng());
		// ~1.1 km: entro i 2 km consentiti.
		double latVicina = evento.getLat() + 0.01;

		EventoDettaglioResponse risposta = modifica(new ModificaEventoRequest(null, null, null, null, latVicina, evento.getLng()));

		assertThat(risposta.lat()).isEqualTo(latVicina);
	}

	// --- Supporto ---

	private EventoDettaglioResponse modifica(ModificaEventoRequest richiesta) {
		return eventoService.modifica(evento.getId(), proprietario.getId(), richiesta);
	}

	private void inCorso() {
		evento.setDataEvento(Instant.now().minus(Duration.ofHours(1)));
		evento.setDataFine(Instant.now().plus(Duration.ofHours(3)));
	}

	private Poi poi(Evento evento, double lat, double lng) {
		Poi poi = new Poi();
		poi.setEvento(evento);
		poi.setTipo(TipoPoi.INGRESSO);
		poi.setLat(lat);
		poi.setLng(lng);
		poi.setCreatoIl(Instant.now());
		return poiRepository.save(poi);
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
