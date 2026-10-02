# Simulazione di attacco CSRF su NoseY

Ambito del team BE1. Eseguita in locale (backend Spring Boot su `localhost:8080`, frontend atteso su
`localhost:5173`), 2026-10-02.

## Obiettivo

Verificare se un sito ostile, visitato da un utente che in un'altra scheda del browser ha una
sessione attiva su NoseY, può innescare un'azione di scrittura sul suo account (CSRF, Cross-Site
Request Forgery) senza che l'utente se ne accorga o dia il consenso.

## Modello di minaccia

Il CSRF classico sfrutta il fatto che il browser allega **da solo** le credenziali (di norma un
cookie di sessione) a ogni richiesta verso un dominio, anche quando la richiesta parte da una pagina
ostile ospitata altrove. Il server, non potendo distinguere "l'ha chiesto davvero l'utente" da "l'ha
innescata una pagina esterna", esegue l'azione.

Endpoint bersaglio scelto per il tentativo: `POST /api/events` (crea un evento, autenticato,
qualunque utente loggato). Scelto perché è un'azione di scrittura innocua da verificare (basta
contare gli eventi prima/dopo) ma rappresentativa di qualunque altro endpoint protetto.

## Cosa c'è da sapere sull'architettura, prima del tentativo

NoseY non usa sessioni né cookie per l'autenticazione: il client manda un JWT nell'header
`Authorization: Bearer <token>` (progettazione v4, sezione 14). Confermato anche leggendo il codice:
nessun `Set-Cookie` in tutto il backend (`grep -rl "Cookie" src/main/java` non trova nulla in
`AuthController`/`TokenService`). Questo di per sé toglie al CSRF classico la sua leva principale, ma
**non l'ho dato per scontato**: l'ho verificato con un tentativo vero, sia automatico che dal vivo.

## Il tentativo

1. **Pagina ostile vera** (`attacco-csrf-demo.html`, in questa cartella): simula un sito esterno che,
   al caricamento, prova in background a mandare `POST /api/events` con un `fetch()` — niente header
   `Authorization` (una pagina esterna non può leggerlo dallo storage del sito vero, per via della
   same-origin policy), un `Origin` diverso da quelli ammessi in `app.cors.allowed-origins`.
2. Aperta nel browser con il backend locale attivo.
3. **Risultato**: nessun evento creato. Verificato non guardando solo il messaggio a schermo ma
   interrogando `GET /api/events` subito dopo: l'evento `"Evento creato dall'attacco CSRF (demo)"`
   non esiste.

## Perché fallisce: tre difese indipendenti, non una

Mandando la stessa richiesta forgiata con `curl`/MockMvc, ognuna isolata dalle altre, emergono tre
livelli che bloccano l'attacco separatamente — se anche uno saltasse, gli altri due reggerebbero
comunque:

1. **CORS lato server, prima di tutto.** Con un `Origin` non in `app.cors.allowed-origins`, Spring
   risponde **403 "Invalid CORS request"** (testo semplice, non il JSON di `GestoreErrori`) — la
   richiesta non arriva nemmeno al controllo di autenticazione. Non è il comportamento che mi
   aspettavo all'inizio (pensavo a un 401), ma è una difesa server-side reale, non solo una
   restrizione lato browser.
2. **Nessuna credenziale ambiente.** Anche togliendo l'header `Origin` (es. uno strumento che non è
   un vero browser), la richiesta non ha comunque l'header `Authorization` — e un `<form>` HTML
   ostile non può mai impostarlo. Risultato: **401 NON_AUTENTICATO**.
3. **Un cookie qualsiasi non serve a niente.** Mandando un `Cookie` finto (quello che un'app basata
   su sessione userebbe), `JwtFilter` lo ignora del tutto: l'unica credenziale che legge è
   `Authorization`. Confermato anche che `POST /api/auth/login` non manda mai un `Set-Cookie`.

In più, un `<form>` HTML puro (senza JavaScript) non potrebbe comunque forgiare un corpo
`application/json` valido per questo endpoint — i form mandano solo
`application/x-www-form-urlencoded` o `multipart/form-data` — quindi il tentativo più "classico" di
CSRF (un form invisibile che si auto-invia) fallirebbe anche solo per questo, ancora prima di CORS o
autenticazione.

## Test automatici

`be/src/test/java/it/epicode/nosey/auth/AttaccoCsrfTest.java` — stessa tecnica di
`SicurezzaHttpTest` (MockMvc con la vera catena di filtri, nessuno stub). Cinque casi:

| Test | Cosa prova | Esito atteso |
|---|---|---|
| `formOstileConOriginEsternoBloccatoDalCors` | Richiesta forgiata con `Origin` esterno | 403 CORS, zero eventi creati |
| `formOstileSenzaOriginNeAuthorization401` | Stessa richiesta senza `Origin` | 401 NON_AUTENTICATO, zero eventi creati |
| `cookieDiSessioneFinteIgnoratoServeSoloAuthorization` | Cookie finto al posto di `Authorization` | 401 NON_AUTENTICATO |
| `loginNonImpostaMaiUnCookie` | Risposta di login | nessun header `Set-Cookie` |
| `conAuthorizationValidoLazioneRiesceDavvero` | Controllo: stessa richiesta, ma con un token vero | 201, evento creato per davvero |

Il quinto test è il controllo di qualità dei primi quattro: dimostra che il blocco non è un bug
generico (es. un endpoint rotto che rifiuta tutto), ma specifico alla richiesta forgiata — con le
credenziali giuste la stessa identica azione riesce.

```
mvn test -Dtest=AttaccoCsrfTest
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
```

## Conclusione

**NoseY non è vulnerabile al CSRF nella sua forma classica**, per scelta architetturale (JWT in
header, mai in cookie) più CORS correttamente ristretto all'origine vera del frontend — non per
un controllo esplicito anti-CSRF (che infatti è disattivato in `SecurityConfig`,
`.csrf(AbstractHttpConfigurer::disable)`, e qui è corretto: un token CSRF protegge i cookie, e qui
non ci sono cookie da proteggere).

## Raccomandazione per il futuro (difesa in profondità)

Se un giorno l'autenticazione passasse da JWT-in-header a un cookie (es. per evitare di tenere il
token in `localStorage`), questa protezione sparirebbe automaticamente e servirebbe reintrodurre
una difesa esplicita: cookie `SameSite=Strict` o `Lax` come prima barriera, più un vero token
anti-CSRF per le richieste di scrittura. Non è una cosa da fare ora — è solo da tenere a mente se
l'architettura di autenticazione cambia.
