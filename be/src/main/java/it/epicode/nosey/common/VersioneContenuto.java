package it.epicode.nosey.common;

import java.util.zip.CRC32;

/**
 * Versione di un contenuto binario (decisione 9): CRC32 in esadecimale, usata
 * come parametro "v" nell'URL dell'immagine e come ETag della risposta.
 * Basta a distinguere un'immagine dalla precedente dopo un nuovo upload.
 */
public final class VersioneContenuto {

	private VersioneContenuto() {
	}

	public static String calcola(byte[] contenuto) {
		CRC32 crc = new CRC32();
		crc.update(contenuto);
		return Long.toHexString(crc.getValue());
	}
}
