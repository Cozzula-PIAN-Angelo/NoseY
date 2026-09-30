package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.ImmagineContenuto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ArtistaService {

	private final ArtistaRepository artistaRepository;

	// Pubblico (decisione 9): un tag img non puo' mandare il token.
	@Transactional(readOnly = true)
	public ImmagineContenuto immagine(UUID artistaId) {
		// Il filtro usa la versione: i byte (campo LAZY) si leggono solo se l'immagine c'e'.
		Artista artista = artistaRepository.findById(artistaId)
				.filter(a -> a.getImmagineVersione() != null)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Immagine non trovata"));
		return new ImmagineContenuto(artista.getImmagine(), artista.getImmagineContentType(),
				artista.getImmagineVersione());
	}
}
