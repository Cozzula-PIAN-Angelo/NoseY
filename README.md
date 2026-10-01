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
3. Dopo la prima build si impostano le due variabili `sync: false`, senza `/` finale:

   | Servizio | Variabile | Valore |
   |---|---|---|
   | `nosey-be` | `ALLOWED_ORIGIN` | `https://nosey-fe.onrender.com` |
   | `nosey-fe` | `VITE_API_URL` | `https://nosey-be.onrender.com` |

4. **Manual Deploy** di entrambi (`VITE_API_URL` e' letta in fase di build).

## Documentazione

I documenti di progetto stanno in [`docs/`](docs/):

- [`NoseY-progettazione.md`](docs/NoseY-progettazione.md) - progettazione v4: convenzioni, endpoint, sicurezza, schema
- [`schema-db.md`](docs/schema-db.md) - schema relazionale (tabelle, relazioni, vincoli)
- [`decisioni.md`](docs/decisioni.md) - decisioni tecniche con motivazioni e alternative
- [`interfacce.md`](docs/interfacce.md) - interfacce condivise fra le parti, rotte e componenti del frontend
- [`regole.md`](docs/regole.md) - regole di lavoro: branch, pull request, quando una card e' «Fatto»
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
