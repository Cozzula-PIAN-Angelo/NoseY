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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * CreaPOI, ModificaPOI (progettazione v4, sezione 5): raggio e limite dei POI. BE1-22.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class PoiServiceTest {

	private static final int LIMITE_POI = 15;

	@Autowired
	private PoiService poiService;
	@Autowired
	private PoiRepository poiRepository;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;

	private Utente proprietario;
	private Evento evento;

	@BeforeEach
	void prepara() {
		proprietario = utente();
		evento = evento();
	}

	// --- Raggio ---

	@Test
	void creaPoiTroppoLontano400() {
		// ~3.3 km a nord: oltre i 2 km consentiti.
		PoiRequest richiesta = new PoiRequest(TipoPoi.INGRESSO, evento.getLat() + 0.03, evento.getLng(), null);

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> poiService.crea(evento.getId(), proprietario.getId(), richiesta));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.POI_TROPPO_LONTANO);
		assertThat(poiRepository.findByEventoId(evento.getId())).isEmpty();
	}

	@Test
	void modificaPoiSpostandoloTroppoLontano400() {
		PoiResponse poi = poiService.crea(evento.getId(), proprietario.getId(),
				new PoiRequest(TipoPoi.USCITA, evento.getLat(), evento.getLng(), null));

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> poiService.modifica(evento.getId(), poi.id(), proprietario.getId(),
						new ModificaPoiRequest(null, evento.getLat() + 0.03, null, null)));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.POI_TROPPO_LONTANO);
		assertThat(poiRepository.findById(poi.id())).get().extracting(Poi::getLat).isEqualTo(evento.getLat());
	}

	// --- Limite ---

	@Test
	void creaPoiOltreIlLimite409() {
		for (int i = 0; i < LIMITE_POI; i++) {
			poiService.crea(evento.getId(), proprietario.getId(),
					new PoiRequest(TipoPoi.EMERGENZA, evento.getLat(), evento.getLng(), null));
		}

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> poiService.crea(evento.getId(), proprietario.getId(),
						new PoiRequest(TipoPoi.EMERGENZA, evento.getLat(), evento.getLng(), null)));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.LIMITE_POI);
		assertThat(poiRepository.countByEventoId(evento.getId())).isEqualTo(LIMITE_POI);
	}

	// --- Supporto ---

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
