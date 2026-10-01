package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * CreaArtista (progettazione v4, sezione 12): nome unico senza distinzione di maiuscole/minuscole.
 * Test di integrazione sul database locale: ogni test viene annullato alla fine.
 */
@SpringBootTest
@Transactional
class AdminArtistaTest {

	@Autowired
	private AdminArtistaService adminArtistaService;
	@Autowired
	private ArtistaRepository artistaRepository;

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
				() -> adminArtistaService.modifica(artista.id(), null, null, null));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.RICHIESTA_VUOTA);
	}

	@Test
	void modificaArtistaInesistente404() {
		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.modifica(UUID.randomUUID(), "Nuovo nome", null, null));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.NON_TROVATO);
	}

	@Test
	void modificaNomeConDuplicatoGiaUsato409() {
		String nomeEsistente = "Jovanotti " + UUID.randomUUID();
		adminArtistaService.crea(nomeEsistente, null);
		ArtistaResponse daModificare = adminArtistaService.crea("Elisa " + UUID.randomUUID(), null);

		ApplicazioneException eccezione = assertThrows(ApplicazioneException.class,
				() -> adminArtistaService.modifica(daModificare.id(), nomeEsistente.toUpperCase(), null, null));

		assertThat(eccezione.getCodiceErrore()).isEqualTo(CodiceErrore.ARTISTA_NOME_GIA_USATO);
	}

	@Test
	void modificaNomeConLoStessoNomeNonDaErrore() {
		String nome = "Negramaro " + UUID.randomUUID();
		ArtistaResponse artista = adminArtistaService.crea(nome, null);

		ArtistaResponse risposta = adminArtistaService.modifica(artista.id(), nome, null, null);

		assertThat(risposta.nome()).isEqualTo(nome);
	}

	@Test
	void modificaDisattivaConAttivoFalse() {
		ArtistaResponse artista = adminArtistaService.crea("Max Pezzali " + UUID.randomUUID(), null);

		ArtistaResponse risposta = adminArtistaService.modifica(artista.id(), null, false, null);

		assertThat(risposta.attivo()).isFalse();
		assertThat(artistaRepository.findById(artista.id())).get().extracting(Artista::isAttivo).isEqualTo(false);
	}

	@Test
	void modificaImmagineLaSostituisce() {
		ArtistaResponse artista = adminArtistaService.crea("Baustelle " + UUID.randomUUID(), null);
		MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", pngMinimo());

		ArtistaResponse risposta = adminArtistaService.modifica(artista.id(), null, null, file);

		assertThat(risposta.immagineUrl()).isNotNull().contains(artista.id().toString());
	}

	// Primi byte di firma PNG: bastano a StorageService per riconoscere il tipo (sniffing sui magic byte).
	private static byte[] pngMinimo() {
		return new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A };
	}
}
