package it.epicode.nosey.user;

import java.time.LocalDate;
import java.util.UUID;
import java.util.zip.CRC32;

/**
 * Dati dell'utente SOLO per l'utente stesso (progettazione v4, sezione 0, DTO comuni).
 * Per gli altri utenti si usa UtentePubblicoResponse.
 */
public record UtenteResponse(
		UUID id,
		String email,
		String nome,
		String cognome,
		String indirizzo,
		LocalDate dataNascita,
		String immagineProfilo,
		String ruolo
) {

	// Va chiamato dentro una transazione: legge il ruolo, che e' LAZY.
	public static UtenteResponse da(Utente utente) {
		return new UtenteResponse(
				utente.getId(),
				utente.getEmail(),
				utente.getNome(),
				utente.getCognome(),
				utente.getIndirizzo(),
				utente.getDataNascita(),
				urlImmagineProfilo(utente),
				utente.getRuolo().getNome());
	}

	/**
	 * Percorso relativo del GET pubblico dell'avatar (decisione 9): il frontend lo prefissa
	 * con l'indirizzo del backend, come ogni altra chiamata. null se non c'e' un'immagine.
	 * v cambia con il contenuto: dopo un nuovo upload il browser non mostra quella in cache.
	 * Da riusare anche in UtentePubblicoResponse.
	 */
	public static String urlImmagineProfilo(Utente utente) {
		if (utente.getImmagineProfilo() == null) {
			return null;
		}
		return "/api/users/" + utente.getId() + "/avatar?v=" + versioneImmagine(utente.getImmagineProfilo());
	}

	/** CRC32 del contenuto in esadecimale: basta a distinguere un'immagine dalla precedente. */
	static String versioneImmagine(byte[] contenuto) {
		CRC32 crc = new CRC32();
		crc.update(contenuto);
		return Long.toHexString(crc.getValue());
	}
}
