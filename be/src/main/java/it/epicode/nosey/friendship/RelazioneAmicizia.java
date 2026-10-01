package it.epicode.nosey.friendship;

import java.util.UUID;

/**
 * statoAmicizia e amiciziaId di PartecipanteResponse (progettazione v4, sezioni 7 e 8), dal punto di
 * vista di chi chiede. amiciziaId e' valorizzato con INVIATA, RICEVUTA e AMICI, altrimenti null.
 * chatId e' la chat della coppia se esiste, come in AmiciziaResponse, ma solo quando c'e' amiciziaId:
 * con AMICI e' sempre valorizzato (pulsante "Chat", docs/interfacce.md).
 */
public record RelazioneAmicizia(StatoAmiciziaVista stato, UUID amiciziaId, UUID chatId) {

	public static final RelazioneAmicizia NESSUNA = new RelazioneAmicizia(StatoAmiciziaVista.NESSUNA, null, null);
	public static final RelazioneAmicizia NON_DISPONIBILE =
			new RelazioneAmicizia(StatoAmiciziaVista.NON_DISPONIBILE, null, null);
}
