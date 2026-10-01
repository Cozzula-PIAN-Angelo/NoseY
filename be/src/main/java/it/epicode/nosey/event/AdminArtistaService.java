package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.ImmagineValidata;
import it.epicode.nosey.common.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

/**
 * CreaArtista, ModificaArtista, EliminaArtista (progettazione v4, sezione 12): solo ADMIN.
 * Il percorso /api/admin/artists/** e' gia' protetto da SecurityConfig.
 */
@Service
@RequiredArgsConstructor
public class AdminArtistaService {

	private static final long DIMENSIONE_MASSIMA_BYTE = 5L * 1024 * 1024; // 5 MB, come FotoService

	private final ArtistaRepository artistaRepository;
	private final ArtistaEventoRepository artistaEventoRepository;
	private final StorageService storageService;

	@Transactional
	public ArtistaResponse crea(String nome, MultipartFile file) {
		String nomeValido = nome.strip();
		if (artistaRepository.existsByNomeIgnoreCase(nomeValido)) {
			throw new ApplicazioneException(CodiceErrore.ARTISTA_NOME_GIA_USATO, "Esiste gia' un artista con questo nome");
		}

		Artista artista = new Artista();
		artista.setNome(nomeValido);
		if (file != null && !file.isEmpty()) {
			ImmagineValidata immagine = storageService.valida(file, DIMENSIONE_MASSIMA_BYTE);
			artista.setImmagine(immagine.contenuto());
			artista.setImmagineContentType(immagine.contentType());
		}
		artistaRepository.save(artista);
		return ArtistaResponse.da(artista);
	}

	@Transactional
	public ArtistaResponse modifica(UUID artistaId, String nome, Boolean attivo, MultipartFile file) {
		boolean nomeValorizzato = nome != null && !nome.isBlank();
		boolean immagineValorizzata = file != null && !file.isEmpty();
		if (!nomeValorizzato && attivo == null && !immagineValorizzata) {
			throw new ApplicazioneException(CodiceErrore.RICHIESTA_VUOTA, "Nessun campo da modificare");
		}

		Artista artista = artistaRepository.findConLockById(artistaId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Artista non trovato"));

		if (nomeValorizzato) {
			String nomeValido = nome.strip();
			if (nomeValido.isEmpty()) {
				throw new ApplicazioneException(CodiceErrore.VALIDAZIONE, "Uno o piu' campi non sono validi",
						Map.of("nome", "non puo' essere vuoto"));
			}
			if (!nomeValido.equalsIgnoreCase(artista.getNome()) && artistaRepository.existsByNomeIgnoreCase(nomeValido)) {
				throw new ApplicazioneException(CodiceErrore.ARTISTA_NOME_GIA_USATO, "Esiste gia' un artista con questo nome");
			}
			artista.setNome(nomeValido);
		}
		if (attivo != null) {
			artista.setAttivo(attivo);
		}
		if (immagineValorizzata) {
			ImmagineValidata immagine = storageService.valida(file, DIMENSIONE_MASSIMA_BYTE);
			artista.setImmagine(immagine.contenuto());
			artista.setImmagineContentType(immagine.contentType());
		}
		return ArtistaResponse.da(artista);
	}

	@Transactional
	public void elimina(UUID artistaId) {
		Artista artista = artistaRepository.findConLockById(artistaId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Artista non trovato"));
		if (artistaEventoRepository.existsByArtistaId(artistaId)) {
			throw new ApplicazioneException(CodiceErrore.ARTISTA_IN_USO, "L'artista e' associato a uno o piu' eventi");
		}
		artistaRepository.delete(artista);
	}
}
