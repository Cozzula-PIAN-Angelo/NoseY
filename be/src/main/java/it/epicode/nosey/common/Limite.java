package it.epicode.nosey.common;

/**
 * I limiti di frequenza in memoria (progettazione v4, sezione 0). I valori stanno in
 * application.yml sotto app.limiti (es. LOGIN_FALLITI → app.limiti.login-falliti).
 * I limiti sui codici via email non sono qui: stanno nel database (colonne di UTENTE).
 */
public enum Limite {
	LOGIN_FALLITI,
	AI,
	ISCRIZIONI,
	RICHIESTE_AMICIZIA,
	NOTIFICHE_MANUALI,
	MESSAGGI_CHAT
}
