# NoseY

Piattaforma di gestione eventi - progetto finale Epicode (BE + FE + PostgreSQL, deploy su Render).

| Parte | Tecnologia | In locale | Su Render |
|---|---|---|---|
| Backend | Spring Boot 4.1.1, Java 25, Maven wrapper | `be` sulla 8080 | Web Service (Docker) `nosey-be` |
| Frontend | React 19, Vite, TypeScript, Tailwind 4, Redux Toolkit | `fe` sulla 5173 | Static Site `nosey-fe` |
| Database | PostgreSQL | locale sulla 5432, database `nosey` | Render PostgreSQL `nosey-db` |

## Endpoint

| Metodo | Percorso | Cosa fa |
|---|---|---|
| GET | `/api/stato` | nome del database collegato e ora del server |
| GET | `/actuator/health` | health check per Render |

Tutti gli endpoint REST stanno sotto `/api`.

## Avvio in locale

1. PostgreSQL sulla 5432 e database creato:
   ```
   createdb -U postgres nosey
   ```
   Credenziali diverse da `postgres` / `admin`: variabili `DB_URL`, `DB_USERNAME`,
   `DB_PASSWORD`, oppure `be/src/main/resources/application.yml`.
2. Doppio clic su `avvia.cmd` (Windows) o `./avvia.sh` (macOS/Linux), oppure:
   ```
   cd be && .\mvnw.cmd spring-boot:run
   cd fe && npm install && npm run dev
   ```
3. http://localhost:5173 - il riquadro deve mostrare `nosey`.

## Deploy su Render

1. Repository Git con `be/`, `fe/`, `render.yaml` nella radice.
2. **New > Blueprint**, si sceglie la repo: nascono `nosey-db`, `nosey-be`, `nosey-fe`.
3. Nel form del Blueprint (o dopo, in **Environment**) si impostano le tre variabili `sync: false`.
   Gli URL senza `/` finale e identici a quelli che Render assegna ai servizi:

   | Servizio | Variabile | Valore |
   |---|---|---|
   | `nosey-be` | `ALLOWED_ORIGIN` | `https://nosey-fe.onrender.com` (vale per CORS e per il WebSocket `/ws`) |
   | `nosey-be` | `GEMINI_API_KEY` | chiave da https://aistudio.google.com/apikey (solo per la descrizione con l'AI) |
   | `nosey-fe` | `VITE_API_URL` | `https://nosey-be.onrender.com` |

4. **Manual Deploy** di `nosey-fe` dopo aver cambiato `VITE_API_URL`: si legge in fase di build, quindi
   serve **Clear build cache & deploy**.

### Cose da sapere

- **Il deploy non parte dai push.** Render non ha l'app GitHub installata sulla repo: dopo un merge in
  `main` si fa **Manual Deploy** a mano, e anche le modifiche a `render.yaml` non si sincronizzano da sole.
- **Avvio lento.** Sul piano gratuito il backend si sospende senza traffico e riparte in circa 3 minuti
  (`Started NoseyApplication in 174 seconds`). Il primo accesso dopo una pausa puo' non rispondere.
- **Email.** Senza il profilo `smtp` gira `LogEmailService`: i codici di verifica e di reset si leggono
  nei log di `nosey-be` (Logs, cerca `[EMAIL FINTA]`). `BrevoEmailService` non esiste ancora.
- **WebSocket.** Il backend non imposta heartbeat STOMP: se una connessione ferma a lungo cade, il client
  si riconnette da solo.

### Prova online (TEAM-03)

1. `https://nosey-be.onrender.com/api/stato` risponde `{"servizio":"attivo","database":"nosey"}`.
2. Nei log di `nosey-be` compaiono `Successfully applied 3 migrations` (Flyway) e `Started NoseyApplication`.
3. Su `https://nosey-fe.onrender.com`: registrazione, poi il codice a 6 cifre dai log (`[EMAIL FINTA]`), poi login.
4. Creare un evento e caricare una foto: l'immagine sta nel database (decisione 4), non su file.
5. Con due utenti amici, un messaggio di chat: passa dal WebSocket (`/user/queue/messages`).

## Documentazione

I documenti di progetto stanno in [`docs/`](docs/):

- [`NoseY-progettazione.md`](docs/NoseY-progettazione.md) - progettazione v4: convenzioni, endpoint, sicurezza, schema
- [`schema-db.md`](docs/schema-db.md) - schema relazionale (tabelle, relazioni, vincoli)
- [`decisioni.md`](docs/decisioni.md) - decisioni tecniche con motivazioni e alternative
- [`interfacce.md`](docs/interfacce.md) - interfacce condivise fra le parti, rotte e componenti del frontend
- [`regole.md`](docs/regole.md) - regole di lavoro: branch personali, pull request, quando una card e' «Fatto»
- [`ruoli.md`](docs/ruoli.md) - membri del team e divisione del lavoro
- [`verbali.md`](docs/verbali.md) - verbali delle riunioni

## Struttura

```
render.yaml                 blueprint: database + backend + frontend
avvia.cmd / avvia.sh        avvio locale (Windows / macOS-Linux)
docs/                       documentazione di progetto
be/
  Dockerfile                usato solo da Render
  src/main/java/it/epicode/nosey/
    NoseyApplication.java
    config/                 DatabaseUrl (DATABASE_URL -> JDBC), CorsConfig (ALLOWED_ORIGIN)
    web/                    StatoController, endpoint di prova
    auth/                   registrazione, verifica email, login/logout
    user/                   dati utente, anonimizzazione
    event/                  eventi, immagini, artisti, marker della mappa interna
    ticket/                 ticket e partecipazioni
    notification/           notifiche persistite e live
    friendship/             richieste di amicizia
    chat/                   messaggi fra amici
    mail/                   invio email (SMTP Gmail)
    ai/                     miglioramento della descrizione dell'evento
    common/                 eccezioni, gestione errori, DTO condivisi
  src/main/resources/application.yml
fe/
  src/lib/api.ts            base delle fetch, da VITE_API_URL
  src/store/index.ts        store Redux (configureStore)
  src/store/apiSlice.ts     RTK Query: endpoint verso il backend
  src/hooks/redux.ts        useAppDispatch / useAppSelector tipizzati
  src/App.tsx               pagina di prova (stato FE -> BE -> DB, via useStatoQuery)
  src/pages/ components/ features/ types/
  .env.example
```
