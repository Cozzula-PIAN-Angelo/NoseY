package it.epicode.nosey.common;

import org.springframework.web.multipart.MultipartFile;

/**
 * Contratto TEAM-02/BE1-05, adattato alla decisione 4 (immagini nel database,
 * niente Cloudinary): valida presenza, dimensione e tipo (sui primi byte) di
 * un'immagine caricata, e restituisce i byte pronti da salvare.
 * 400 FILE_NON_VALIDO se qualcosa non va (progettazione v4, sezione 0 "Upload").
 */
public interface StorageService {

	ImmagineValidata valida(MultipartFile file, long dimensioneMassimaByte);
}
