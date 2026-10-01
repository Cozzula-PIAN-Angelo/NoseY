package it.epicode.nosey.chat;

import java.util.List;

/**
 * Una pagina di ListaMessaggi (sezione 9): messaggi dal piu' recente, altri = ce ne sono di piu' vecchi.
 * Per la pagina successiva si passa come before l'id dell'ultimo messaggio della lista.
 */
public record MessaggiResponse(List<MessaggioResponse> messaggi, boolean altri) {
}
