package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.user.RuoloRepository;
import it.epicode.nosey.user.Utente;
import it.epicode.nosey.user.UtenteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * CreaArtista, ModificaArtista, EliminaArtista (progettazione v4, sezione 12): solo ADMIN.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class AdminArtistaTest {

	@Autowired
	private AdminArtistaService adminArtistaService;
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

	// --- ListaArtisti ADMIN ---

	@Test
	void listaComprendeAncheGliArtistiDisattivati() {
		ArtistaResponse attivo = adminArtistaService.crea("Fabrizio De Andre " + UUID.randomUUID(), null);
		ArtistaResponse disattivato = adminArtistaService.crea("Luciano Ligabue " + UUID.randomUUID(), null);
		adminArtistaService.modifica(disattivato.id(), null, false, null, false);

		List<ArtistaResponse> lista = adminArtistaService.lista(null);

		assertThat(lista).extracting(ArtistaResponse::id).contains(attivo.id(), disattivato.id());
		assertThat(lista).filteredOn(a -> a.id().equals(disattivato.id()))
				.extracting(ArtistaResponse::attivo).containsExactly(false);
	}

	@Test
	void listaInOrdineAlfabetico() {
		String prefisso = UUID.randomUUID().toString();
		adminArtistaService.crea("Zucchero " + prefisso, null);
		adminArtistaService.crea("Alice " + prefisso, null);

		List<ArtistaResponse> lista = adminArtistaService.lista(prefisso);

		assertThat(lista).extracting(ArtistaResponse::nome)
				.containsExactly("Alice " + prefisso, "Zucchero " + prefisso);
	}

	@Test
	void listaConSearchFiltraSenzaDistinguereLeMaiuscole() {
		String nome = "Caparezza " + UUID.randomUUID();
		adminArtistaService.crea(nome, null);
		adminArtistaService.crea("Altro artista " + UUID.randomUUID(), null);

		List<ArtistaResponse> lista = adminArtistaService.lista(nome.toUpperCase());

		assertThat(lista).extracting(ArtistaResponse::nome).containsExactly(nome);
	}

	@Test
	void creaArtistaConNomeNuovo() {
		String nome = "Vasco Rossi " + UUID.randomUUID();

		ArtistaResponse risposta = adminArtistaService.crea(nome, null);

		assertThat(risposta.nome()).isEqualTo(nome);
		assertThat(risposta.attivo()).isTrue();
		assertThat(risposta.immagineUrl()).isNull();
		assertThat(artistaRepository.findById(risposta.id())).isPresent();
	}

	@Test
	void creaArtistaConNomeGiaUsatoSenzaDistinguereLeMaiuscole() {
		String nome = "Vasco Rossi " + UUID.randomUUID();
		adminArtistaService.crea(nome, null);

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.crea(nome.toUpperCase(), null));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.ARTISTA_NOME_GIA_USATO);
	}

	@Test
	void creaArtistaConImmagineValidaLaSalva() {
		String nome = "Ligabue " + UUID.randomUUID();
		MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", pngMinimo());

		ArtistaResponse risposta = adminArtistaService.crea(nome, file);

		assertThat(risposta.immagineUrl()).isNotNull().contains(risposta.id().toString());
	}

	// --- ModificaArtista ---

	@Test
	void modificaSenzaCampiRichiestaVuota() {
		ArtistaResponse artista = adminArtistaService.crea("Zucchero " + UUID.randomUUID(), null);

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.modifica(artista.id(), null, null, null, false));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.RICHIESTA_VUOTA);
	}

	@Test
	void modificaArtistaInesistente404() {
		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.modifica(UUID.randomUUID(), "Nuovo nome", null, null, false));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.NON_TROVATO);
	}

	@Test
	void modificaNomeConDuplicatoGiaUsato409() {
		String nomeEsistente = "Jovanotti " + UUID.randomUUID();
		adminArtistaService.crea(nomeEsistente, null);
		ArtistaResponse daModificare = adminArtistaService.crea("Elisa " + UUID.randomUUID(), null);

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.modifica(daModificare.id(), nomeEsistente.toUpperCase(), null, null, false));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.ARTISTA_NOME_GIA_USATO);
	}

	@Test
	void modificaNomeConLoStessoNomeNonDaErrore() {
		String nome = "Negramaro " + UUID.randomUUID();
		ArtistaResponse artista = adminArtistaService.crea(nome, null);

		ArtistaResponse risposta = adminArtistaService.modifica(artista.id(), nome, null, null, false);

		assertThat(risposta.nome()).isEqualTo(nome);
	}

	@Test
	void modificaConNomeVuoto400() {
		ArtistaResponse artista = adminArtistaService.crea("Caparezza " + UUID.randomUUID(), null);

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.modifica(artista.id(), "", null, null, false));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.VALIDAZIONE);
		assertThat(eccezione.getCampi()).containsKey("nome");
	}

	@Test
	void modificaDisattivaConAttivoFalse() {
		ArtistaResponse artista = adminArtistaService.crea("Max Pezzali " + UUID.randomUUID(), null);

		ArtistaResponse risposta = adminArtistaService.modifica(artista.id(), null, false, null, false);

		assertThat(risposta.attivo()).isFalse();
		assertThat(artistaRepository.findById(artista.id())).get().extracting(Artista::isAttivo).isEqualTo(false);
	}

	@Test
	void modificaImmagineLaSostituisce() {
		ArtistaResponse artista = adminArtistaService.crea("Baustelle " + UUID.randomUUID(), null);
		MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", pngMinimo());

		ArtistaResponse risposta = adminArtistaService.modifica(artista.id(), null, null, file, false);

		assertThat(risposta.immagineUrl()).isNotNull().contains(artista.id().toString());
	}

	@Test
	void modificaConRimuoviImmagineLaToglie() {
		MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", pngMinimo());
		ArtistaResponse artista = adminArtistaService.crea("Afterhours " + UUID.randomUUID(), file);

		ArtistaResponse risposta = adminArtistaService.modifica(artista.id(), null, null, null, true);

		assertThat(risposta.immagineUrl()).isNull();
	}

	@Test
	void modificaConFileERimuoviImmagineInsieme400() {
		ArtistaResponse artista = adminArtistaService.crea("Marlene Kuntz " + UUID.randomUUID(), null);
		MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", pngMinimo());

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.modifica(artista.id(), null, null, file, true));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.VALIDAZIONE);
	}

	// --- EliminaArtista ---

	@Test
	void eliminaArtistaInesistente404() {
		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.elimina(UUID.randomUUID()));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.NON_TROVATO);
	}

	@Test
	void eliminaArtistaSenzaEventiLoCancella() {
		ArtistaResponse artista = adminArtistaService.crea("Vinicio Capossela " + UUID.randomUUID(), null);

		adminArtistaService.elimina(artista.id());

		assertThat(artistaRepository.findById(artista.id())).isEmpty();
	}

	@Test
	void eliminaArtistaAssociatoAUnEvento409() {
		ArtistaResponse artista = adminArtistaService.crea("Subsonica " + UUID.randomUUID(), null);
		associaAdEvento(artista.id());

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.elimina(artista.id()));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.ARTISTA_IN_USO);
		assertThat(artistaRepository.findById(artista.id())).isPresent();
	}

	// Primi byte di firma PNG: bastano a StorageService per riconoscere il tipo (sniffing sui magic byte).
	private static byte[] pngMinimo() {
		return new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A };
	}

	private void associaAdEvento(UUID artistaId) {
		Utente proprietario = new Utente();
		proprietario.setRuolo(ruoloRepository.findByNome("USER").orElseThrow());
		proprietario.setEmail("test-" + UUID.randomUUID() + "@nosey.test");
		proprietario.setPasswordHash("non-usata");
		proprietario.setNome("Anna");
		proprietario.setCognome("Bianchi");
		proprietario.setVerificato(true);
		proprietario.setCreatoIl(Instant.now());
		utenteRepository.save(proprietario);

		Evento evento = new Evento();
		evento.setProprietario(proprietario);
		evento.setTitolo("Concerto al parco");
		evento.setDataEvento(Instant.now().plus(Duration.ofDays(7)));
		evento.setDataFine(Instant.now().plus(Duration.ofDays(8)));
		evento.setLat(45.07);
		evento.setLng(7.69);
		evento.setCreatoIl(Instant.now());
		eventoRepository.save(evento);

		ArtistaEvento artistaEvento = new ArtistaEvento();
		artistaEvento.setEvento(evento);
		artistaEvento.setArtista(artistaRepository.findById(artistaId).orElseThrow());
		artistaEventoRepository.save(artistaEvento);
	}
}
