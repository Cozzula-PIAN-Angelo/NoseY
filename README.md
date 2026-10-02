<div align="center">

# 👃 NoseY

### Piattaforma di gestione eventi dal vivo — progetto finale Epicode

Backend **Spring Boot** · Frontend **React** · Database **PostgreSQL** · Deploy su **Render**

<br>

![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1.1-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-25-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=for-the-badge&logo=redux&logoColor=white)

</div>

---

## 📑 Indice

- [🧭 Panoramica](#panoramica)
- [🔌 Endpoint](#endpoint)
- [🚀 Avvio in locale](#avvio)
- [☁️ Deploy su Render](#deploy)
  - [💡 Cose da sapere](#cose-da-sapere)
  - [✅ Prova online](#prova-online)
- [🔒 Sicurezza](#sicurezza)
- [📚 Documentazione](#documentazione)
- [🗂️ Struttura del progetto](#struttura)

---

<a id="panoramica"></a>

## 🧭 Panoramica

| Parte | 🛠️ Tecnologia | 💻 In locale | ☁️ Su Render |
|---|---|---|---|
| **Backend** | Spring Boot 4.1.1, Java 25, Maven wrapper | `be` sulla porta `8080` | Web Service (Docker) `nosey-be` |
| **Frontend** | React 19, Vite, TypeScript, Tailwind 4, Redux Toolkit | `fe` sulla porta `5173` | Static Site `nosey-fe` |
| **Database** | PostgreSQL | porta `5432`, database `nosey` | Render PostgreSQL `nosey-db` |

---

<a id="endpoint"></a>

## 🔌 Endpoint

| Metodo | Percorso | Cosa fa |
|:---:|---|---|
| `GET` | `/api/stato` | 🟢 nome del database collegato e ora del server |
| `GET` | `/actuator/health` | ❤️ health check per Render |

> ℹ️ Tutti gli endpoint REST stanno sotto **`/api`**.

---

<a id="avvio"></a>

## 🚀 Avvio in locale

**1️⃣ PostgreSQL** sulla porta `5432` con il database creato:

```bash
createdb -U postgres nosey
```

> 🔑 Credenziali diverse da `postgres` / `admin`? Usa le variabili `DB_URL`, `DB_USERNAME`,
> `DB_PASSWORD`, oppure modifica `be/src/main/resources/application.yml`.

**2️⃣ Avvia backend e frontend** — doppio clic su `avvia.cmd` (Windows) o `./avvia.sh` (macOS/Linux), oppure a mano:

```bash
cd be && ./mvnw spring-boot:run      # Windows: .\mvnw.cmd spring-boot:run
cd fe && npm install && npm run dev
```

**3️⃣ Apri** 👉 http://localhost:5173 — il riquadro deve mostrare `nosey`.

---

<a id="deploy"></a>

## ☁️ Deploy su Render

1. 📦 Repository Git con `be/`, `fe/` e `render.yaml` nella radice.
2. **New → Blueprint**, si sceglie la repo: nascono `nosey-db`, `nosey-be`, `nosey-fe`.
3. ⚙️ Nel form del Blueprint (o dopo, in **Environment**) si impostano le variabili `sync: false`.
   Gli URL **senza `/` finale** e identici a quelli che Render assegna ai servizi:

   | Servizio | Variabile | Valore |
   |---|---|---|
   | `nosey-be` | `ALLOWED_ORIGIN` | `https://nosey-fe.onrender.com` (vale per CORS e per il WebSocket `/ws`) |
   | `nosey-be` | `GEMINI_API_KEY` | chiave da https://aistudio.google.com/apikey (solo per la descrizione con l'AI) |
   | `nosey-fe` | `VITE_API_URL` | `https://nosey-be.onrender.com` |

4. 🔁 **Manual Deploy** di `nosey-fe` dopo aver cambiato `VITE_API_URL`: si legge in fase di build, quindi serve **Clear build cache & deploy**.

<a id="cose-da-sapere"></a>

### 💡 Cose da sapere

- 🚫 **Il deploy non parte dai push.** Render non ha l'app GitHub installata sulla repo: dopo un merge in
  `main` si fa **Manual Deploy** a mano, e anche le modifiche a `render.yaml` non si sincronizzano da sole.
- 🐌 **Avvio lento.** Sul piano gratuito il backend si sospende senza traffico e riparte in circa 3 minuti
  (`Started NoseyApplication in 174 seconds`). Il primo accesso dopo una pausa può non rispondere.
- 📧 **Email.** Online gira `BrevoEmailService` (profilo `prod`), che invia via API HTTP di Brevo: servono
  `SPRING_PROFILES_ACTIVE=prod`, `BREVO_API_KEY` e `MAIL_FROM` (un mittente confermato in Brevo) tra le
  variabili di `nosey-be`. I valori si inseriscono a mano su Render (Environment): la chiave non va mai nel
  repository. Senza il profilo `prod` gira `LogEmailService`: i codici si leggono nei log di `nosey-be`
  (Logs, cerca `[EMAIL FINTA]`). Con `prod` attivo ma chiave o mittente vuoti l'email non parte e nei log
  compare un errore.
- 🔌 **WebSocket.** Il backend non imposta heartbeat STOMP: se una connessione ferma a lungo cade, il client
  si riconnette da solo.

<a id="prova-online"></a>

### ✅ Prova online (TEAM-03)

1. `https://nosey-be.onrender.com/api/stato` risponde `{"servizio":"attivo","database":"nosey"}`.
2. Nei log di `nosey-be` compaiono `Successfully applied 3 migrations` (Flyway) e `Started NoseyApplication`.
3. Su `https://nosey-fe.onrender.com`: registrazione, poi il codice a 6 cifre ricevuto via email, poi login.
4. Creare un evento e caricare una foto: l'immagine sta nel database (decisione 4), non su file.
5. Con due utenti amici, un messaggio di chat: passa dal WebSocket (`/user/queue/messages`).

---

<a id="sicurezza"></a>

## 🔒 Sicurezza

Il progetto è stato verificato contro le principali classi di attacco web (OWASP), senza vulnerabilità rilevate:

| Attacco | Difesa | Esito |
|---|---|:---:|
| 💉 **SQL Injection** | query parametrizzate (JPA/Hibernate) | ✅ respinto |
| 🧬 **XSS** | escape automatico di React, nessun `dangerouslySetInnerHTML` | ✅ respinto |
| 🎭 **CSRF** | token JWT nell'header, nessun cookie di sessione | ✅ respinto |
| 🔑 **Autenticazione** | BCrypt, rate limit sul login, token a scadenza | ✅ respinto |

> 📄 Report completo: [`docs/report-sicurezza.md`](docs/report-sicurezza.md) · approfondimento CSRF in [`docs/sicurezza/`](docs/sicurezza/).

---

<a id="documentazione"></a>

## 📚 Documentazione

I documenti di progetto stanno in [`docs/`](docs/):

| Documento | Contenuto |
|---|---|
| [`NoseY-progettazione.md`](docs/NoseY-progettazione.md) | 📐 progettazione v4: convenzioni, endpoint, sicurezza, schema |
| [`schema-db.md`](docs/schema-db.md) | 🗄️ schema relazionale (tabelle, relazioni, vincoli) |
| [`decisioni.md`](docs/decisioni.md) | 🧠 decisioni tecniche con motivazioni e alternative |
| [`interfacce.md`](docs/interfacce.md) | 🔗 interfacce condivise fra le parti, rotte e componenti del frontend |
| [`regole.md`](docs/regole.md) | 📏 regole di lavoro: branch personali, pull request, quando una card è «Fatto» |
| [`ruoli.md`](docs/ruoli.md) | 👥 membri del team e divisione del lavoro |
| [`verbali.md`](docs/verbali.md) | 📝 verbali delle riunioni |
| [`report-sicurezza.md`](docs/report-sicurezza.md) | 🔒 report di sicurezza (SQLi, XSS, CSRF, autenticazione) |

> 🍪 Nell'app sono disponibili anche le pagine pubbliche **Cookie Policy** (`/cookies`) e **Privacy Policy** (`/privacy`).

---

<a id="struttura"></a>

## 🗂️ Struttura del progetto

```
📦 NoseY
├── render.yaml                 blueprint: database + backend + frontend
├── avvia.cmd / avvia.sh        avvio locale (Windows / macOS-Linux)
├── docs/                       documentazione di progetto
│
├── be/                         🟢 BACKEND (Spring Boot)
│   ├── Dockerfile              usato solo da Render
│   ├── src/main/java/it/epicode/nosey/
│   │   ├── NoseyApplication.java
│   │   ├── config/             DatabaseUrl (DATABASE_URL → JDBC), CorsConfig (ALLOWED_ORIGIN)
│   │   ├── web/                StatoController, endpoint di prova
│   │   ├── auth/               registrazione, verifica email, login/logout
│   │   ├── user/               dati utente, anonimizzazione
│   │   ├── event/              eventi, immagini, artisti, marker della mappa interna
│   │   ├── ticket/             ticket e partecipazioni
│   │   ├── notification/       notifiche persistite e live
│   │   ├── friendship/         richieste di amicizia
│   │   ├── chat/               messaggi fra amici
│   │   ├── mail/               invio email (Brevo via API in prod, LogEmailService in locale)
│   │   ├── ai/                 miglioramento della descrizione dell'evento
│   │   └── common/             eccezioni, gestione errori, DTO condivisi
│   └── src/main/resources/application.yml
│
└── fe/                         🔵 FRONTEND (React + Vite)
    ├── src/main.tsx            punto d'ingresso: monta il RouterProvider
    ├── src/router.tsx          rotte dell'app (react-router)
    ├── src/App.tsx             guscio comune: barra di navigazione, pagina, footer
    ├── src/lib/api.ts          base delle fetch, da VITE_API_URL
    ├── src/store/              store Redux + RTK Query (apiSlice)
    ├── src/hooks/redux.ts      useAppDispatch / useAppSelector tipizzati
    ├── src/pages/ components/ features/ types/
    └── .env.example
```

<div align="center">
<br>

**Team NoseY** · Epicode

</div>
