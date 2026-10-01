package it.epicode.nosey.ai;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.event.Evento;
import it.epicode.nosey.event.EventoRepository;
import it.epicode.nosey.event.FotoEvento;
import it.epicode.nosey.event.FotoEventoRepository;
import it.epicode.nosey.event.StatoEventoDb;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * MiglioraDescrizioneAI (progettazione v4, sezione 3): ordine dei controlli, scelta della
 * descrizione (body o salvata) e 502 del provider. Gemini e' sostituito da un mock.
 * Test di integrazione sul database locale (decisione 10): ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class DescrizioneAiServiceTest {

	private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3};

	@Autowired
	private DescrizioneAiService descrizioneAiService;
	@Autowired
	private EventoRepository eventoRepository;
	@Autowired
	private FotoEventoRepository fotoEventoRepository;
	@Autowired
	private UtenteRepository utenteRepository;
	@Autowired
	private RuoloRepository ruoloRepository;
	@MockitoBean
	private ProviderAi providerAi;

	private Utente proprietario;
	private Evento evento;
	private FotoEvento foto;

	@BeforeEach
	void prepara() {
		proprietario = utente("Anna", "Bianchi");
		evento = evento(proprietario, "Serata jazz al parco");
		foto = foto(evento);
		when(providerAi.migliora(any(), anyString(), anyString())).thenReturn("Descrizione migliorata");
	}

	// --- Caso riuscito e scelta della descrizione ---

	@Test
	void usaLaDescrizioneDelBodyEMandaFotoEDescrizioneAlProvider() {
		DescrizionePropostaResponse risposta = migliora(proprietario, evento, foto.getId(), "  Testo non salvato  ");

		assertThat(risposta.descrizioneProposta()).isEqualTo("Descrizione migliorata");
		verify(providerAi).migliora(eq(PNG), eq("image/png"), eq("Testo non salvato"));
	}

	@Test
	void senzaDescrizioneNelBodyUsaQuellaSalvata() {
		migliora(proprietario, evento, foto.getId(), null);
		migliora(proprietario, evento, foto.getId(), "   ");

		verify(providerAi, times(2)).migliora(any(), anyString(), eq("Serata jazz al parco"));
	}

	@Test
	void nonSalvaLaProposta() {
		migliora(proprietario, evento, foto.getId(), "Testo nuovo");

		assertThat(eventoRepository.findById(evento.getId()).orElseThrow().getDescrizione())
				.isEqualTo("Serata jazz al parco");
	}

	// --- Errori, nell'ordine della sezione 3 ---

	@Test
	void undicesimaRichiestaInUnOra429() {
		for (int i = 0; i < 10; i++) {
			migliora(proprietario, evento, foto.getId(), null);
		}
		assertErrore(CodiceErrore.TROPPE_RICHIESTE, () -> migliora(proprietario, evento, foto.getId(), null));
	}

	@Test
	void eventoInesistente404() {
		assertErrore(CodiceErrore.NON_TROVATO, () -> descrizioneAiService.migliora(UUID.randomUUID(),
				proprietario.getId(), new MiglioraDescrizioneRequest(foto.getId(), null)));
	}

	@Test
	void nonProprietario403() {
		Utente altro = utente("Mario", "Rossi");
		assertErrore(CodiceErrore.NON_PROPRIETARIO, () -> migliora(altro, evento, foto.getId(), null));
	}

	@Test
	void fotoInesistenteODiUnAltroEvento404() {
		Evento altroEvento = evento(proprietario, "Altro");
		FotoEvento fotoAltroEvento = foto(altroEvento);

		assertErrore(CodiceErrore.NON_TROVATO, () -> migliora(proprietario, evento, UUID.randomUUID(), null));
		assertErrore(CodiceErrore.NON_TROVATO, () -> migliora(proprietario, evento, fotoAltroEvento.getId(), null));
	}

	@Test
	void eventoAnnullato409() {
		evento.setStato(StatoEventoDb.ANNULLATO);
		assertErrore(CodiceErrore.EVENTO_ANNULLATO, () -> migliora(proprietario, evento, foto.getId(), null));
	}

	@Test
	void eventoConcluso409() {
		evento.setDataEvento(Instant.now().minus(Duration.ofDays(3)));
		evento.setDataFine(Instant.now().minus(Duration.ofDays(2)));
		assertErrore(CodiceErrore.EVENTO_CONCLUSO, () -> migliora(proprietario, evento, foto.getId(), null));
	}

	@Test
	void nessunaDescrizioneNeNelBodyNeSalvata400() {
		evento.setDescrizione(null);
		assertErrore(CodiceErrore.DESCRIZIONE_MANCANTE, () -> migliora(proprietario, evento, foto.getId(), ""));
	}

	@Test
	void erroreDelProvider502() {
		when(providerAi.migliora(any(), anyString(), anyString()))
				.thenThrow(new ApplicazioneException(CodiceErrore.SERVIZIO_ESTERNO, "non disponibile"));
		assertErrore(CodiceErrore.SERVIZIO_ESTERNO, () -> migliora(proprietario, evento, foto.getId(), null));
	}

	@Test
	void erroreDiControlloNonChiamaIlProvider() {
		Utente altro = utente("Mario", "Rossi");
		assertErrore(CodiceErrore.NON_PROPRIETARIO, () -> migliora(altro, evento, foto.getId(), null));
		verify(providerAi, never()).migliora(any(), anyString(), anyString());
	}

	// --- Supporto ---

	private DescrizionePropostaResponse migliora(Utente utente, Evento evento, UUID fotoId, String descrizione) {
		return descrizioneAiService.migliora(evento.getId(), utente.getId(),
				new MiglioraDescrizioneRequest(fotoId, descrizione));
	}

	private void assertErrore(CodiceErrore atteso, Executable azione) {
		ApplicazioneException ex = assertThrows(ApplicazioneException.class, azione);
		assertThat(ex.getCodiceErrore()).isEqualTo(atteso);
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

	private Evento evento(Utente proprietario, String descrizione) {
		Evento evento = new Evento();
		evento.setProprietario(proprietario);
		evento.setTitolo("Concerto al parco");
		evento.setDescrizione(descrizione);
		evento.setDataEvento(Instant.now().plus(Duration.ofDays(7)));
		evento.setDataFine(Instant.now().plus(Duration.ofDays(8)));
		evento.setLat(45.07);
		evento.setLng(7.69);
		evento.setCreatoIl(Instant.now());
		return eventoRepository.save(evento);
	}

	private FotoEvento foto(Evento evento) {
		FotoEvento foto = new FotoEvento();
		foto.setEvento(evento);
		foto.setContenuto(PNG);
		foto.setContentType("image/png");
		foto.setCaricataIl(Instant.now());
		return fotoEventoRepository.save(foto);
	}
}
