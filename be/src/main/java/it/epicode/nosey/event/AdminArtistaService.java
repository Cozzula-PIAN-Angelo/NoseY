package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.ImmagineValidata;
import it.epicode.nosey.common.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * CreaArtista, ModificaArtista, EliminaArtista (progettazione v4, sezione 12): solo ADMIN.
 * Il percorso /api/admin/artists/** e' gia' protetto da SecurityConfig.
 */
@Service
@RequiredArgsConstructor
public class AdminArtistaService {

	private static final long DIMENSIONE_MASSIMA_BYTE = 5L * 1024 * 1024; // 5 MB, come FotoService

	private final ArtistaRepository artistaRepository;
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
}
