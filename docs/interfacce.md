# NoseY - Interfacce condivise (TEAM-02)

Quello che un'area del backend usa dal lavoro dell'altra. Per ogni voce: chi la implementa,
come si usa e la sezione della progettazione di riferimento.

## LimitiService (pacchetto `common`) — implementa BE2-04

Limiti di frequenza in memoria (progettazione v4, sezione 0). Decisione 6.

```java
public enum Limite { LOGIN_FALLITI, AI, ISCRIZIONI, RICHIESTE_AMICIZIA, NOTIFICHE_MANUALI, MESSAGGI_CHAT }

void consuma(Limite limite, String chiave);   // controlla e registra (atomico): 429 se superato
void controlla(Limite limite, String chiave); // solo controllo: 429 se superato
void registra(Limite limite, String chiave);  // solo registrazione, senza controllo
void azzera(Limite limite, String chiave);
```

- Il 429 e' una `ApplicazioneException` con `TROPPE_RICHIESTE`: il `GestoreErrori` la converte.
- Si chiama al punto del 429 nell'ordine dei controlli (sezione 0): dopo la validazione del DTO,
  prima dei 404/403. Con `consuma` il tentativo conta anche se la richiesta poi fallisce.
- Chiave: una stringa scelta da chi chiama, sempre la stessa per lo stesso limite.

| Limite | Valore (application.yml) | Chiave | Chi lo usa |
|---|---|---|---|
| `LOGIN_FALLITI` | 10 in 15 minuti | email normalizzata | login (BE2-03), con controlla/registra/azzera |
| `AI` | 10 in 1 ora | id dell'utente | miglioramento della descrizione (BE1-15) |
| `ISCRIZIONI` | 20 in 24 ore | id dell'utente | iscrizione a un evento (BE1-10) |
| `RICHIESTE_AMICIZIA` | 30 in 24 ore | id dell'utente | richiesta di amicizia (BE2-10) |
| `NOTIFICHE_MANUALI` | 5 in 24 ore | id dell'evento | notifica manuale del proprietario (BE1-16) |
| `MESSAGGI_CHAT` | 30 in 1 minuto | id dell'utente | invio di un messaggio, errore sul WebSocket (BE2-14) |

I limiti sui codici via email (1 ogni 60 secondi, 5 ogni 24 ore) NON passano da qui: stanno nel
database (colonne di `utente`) e li gestisce `AuthService`.
