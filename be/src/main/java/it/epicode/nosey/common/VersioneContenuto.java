package it.epicode.nosey.common;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Versione di un contenuto binario (decisione 9): primi 16 caratteri esadecimali dell'MD5,
 * usata come parametro "v" nell'URL dell'immagine e come ETag della risposta.
 * Stesso calcolo della migrazione V3 (left(md5(...), 16)), che riempie le righe gia' esistenti.
 * Basta a distinguere un'immagine dalla precedente dopo un nuovo upload: non e' una firma di sicurezza.
 */
public final class VersioneContenuto {

	private VersioneContenuto() {
	}

	public static String calcola(byte[] contenuto) {
		try {
			byte[] md5 = MessageDigest.getInstance("MD5").digest(contenuto);
			return HexFormat.of().formatHex(md5).substring(0, 16);
		} catch (NoSuchAlgorithmException e) {
			// MD5 e' tra gli algoritmi che ogni JVM deve fornire.
			throw new IllegalStateException(e);
		}
	}
}
