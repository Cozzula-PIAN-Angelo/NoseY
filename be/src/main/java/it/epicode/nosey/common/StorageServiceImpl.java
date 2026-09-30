package it.epicode.nosey.common;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;

@Service
public class StorageServiceImpl implements StorageService {

	private static final byte[] FIRMA_JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
	private static final byte[] FIRMA_PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};

	@Override
	public ImmagineValidata valida(MultipartFile file, long dimensioneMassimaByte) {
		if (file == null || file.isEmpty()) {
			throw new ApplicazioneException(CodiceErrore.FILE_NON_VALIDO, "File mancante");
		}
		if (file.getSize() > dimensioneMassimaByte) {
			throw new ApplicazioneException(CodiceErrore.FILE_NON_VALIDO, "Il file supera la dimensione massima consentita");
		}
		byte[] contenuto;
		try {
			contenuto = file.getBytes();
		} catch (IOException e) {
			throw new ApplicazioneException(CodiceErrore.FILE_NON_VALIDO, "File non leggibile");
		}
		String contentType = tipoDaPrimiByte(contenuto);
		if (contentType == null) {
			throw new ApplicazioneException(CodiceErrore.FILE_NON_VALIDO, "Tipo di file non ammesso (solo JPEG, PNG, WEBP)");
		}
		return new ImmagineValidata(contenuto, contentType);
	}

	// Tipo verificato sui primi byte, non su estensione o Content-Type dichiarato
	// (progettazione v4, sezione 0): ImageIO non legge i WEBP, quindi non si usa.
	private String tipoDaPrimiByte(byte[] contenuto) {
		if (iniziaCon(contenuto, FIRMA_JPEG)) {
			return "image/jpeg";
		}
		if (iniziaCon(contenuto, FIRMA_PNG)) {
			return "image/png";
		}
		if (contenuto.length >= 12
				&& contenuto[0] == 'R' && contenuto[1] == 'I' && contenuto[2] == 'F' && contenuto[3] == 'F'
				&& contenuto[8] == 'W' && contenuto[9] == 'E' && contenuto[10] == 'B' && contenuto[11] == 'P') {
			return "image/webp";
		}
		return null;
	}

	private boolean iniziaCon(byte[] contenuto, byte[] firma) {
		if (contenuto.length < firma.length) {
			return false;
		}
		return Arrays.equals(contenuto, 0, firma.length, firma, 0, firma.length);
	}
}
