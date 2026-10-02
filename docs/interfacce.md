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

## EmailService (pacchetto `mail`) — implementa BE1-04

Invio delle 4 email del progetto (progettazione v4, sezione 0). Decisione 3.

```java
void inviaCodiceVerifica(String destinatario, String nome, String codice);
void inviaTicket(String destinatario, String nome, String titoloEvento, Instant dataEvento, String codiceTicket);
void inviaCodiceReset(String destinatario, String nome, String codice);
void inviaPasswordCambiata(String destinatario, String nome);
```

- Tre implementazioni, scelte dal profilo Spring: `LogEmailService` (default, scrive un riepilogo
  nel log) · `SmtpEmailService` (profilo `smtp`, Gmail SMTP + template Thymeleaf in `templates/mail/`)
  · `BrevoEmailService` (profilo `prod`, API HTTP di Brevo con timeout di 5 secondi, stessi template).
- Chi deve inviare un'email NON chiama direttamente `EmailService`: pubblica uno dei 4 eventi
  (`CodiceVerificaEmailEvent`, `TicketEmailEvent`, `CodiceResetEmailEvent`, `PasswordCambiataEmailEvent`,
  pacchetto `mail`) con `ApplicationEventPublisher`, DENTRO la transazione. `EmailEventListener` li
  raccoglie `@Async`, DOPO il commit (`@TransactionalEventListener(AFTER_COMMIT)`): se l'invio
  fallisce si scrive nel log, la richiesta resta valida.
- Parametri primitivi, mai entita': l'evento/listener non deve conoscere JPA.

## AnonimizzazioneEventiService (pacchetto `event`) — implementa BE1-04

Il lato eventi dell'anonimizzazione (progettazione v4, sezione 2 "Anonimizzazione"), da chiamare
da `Anonimizzazione` (lato utenti, BE2) dentro la stessa transazione.

```java
void annullaEventiProprietario(UUID utenteId); // eventi PROGRAMMATO di cui e' proprietario -> ANNULLATO
void cancellaIscrizioniFuture(UUID utenteId);  // le sue iscrizioni a eventi PROGRAMMATO -> cancellate
```

- Implementazione reale (non finta): usa `EventoRepository`/`PartecipanteRepository` gia' pronti.
- Manda anche la notifica `ANNULLAMENTO` ai partecipanti di ogni evento annullato
  (`NotificheService.notificaAnnullamento`).

## NotificheService (pacchetto `notification`) — implementa BE2-08

Creazione delle notifiche (progettazione v4, sezione 10 e D10).

```java
void notificaModifica(Evento evento, Set<ParteEvento> parti); // partecipanti, accorpata
void notificaIscrizione(Evento evento);                      // proprietario, accorpata
int  notificaManuale(Evento evento, String testo);           // partecipanti, restituisce { inviate }
void notificaAnnullamento(Evento evento);                    // partecipanti, con motivoAnnullamento
void notificaFotoRimossa(Evento evento);                     // proprietario, MODERAZIONE
void notificaAnnullataDaModerazione(Evento evento);          // proprietario, MODERAZIONE con motivo
void notificaRichiestaAmicizia(Amicizia amicizia);           // ricevente, RICHIESTA
void notificaAmiciziaAccettata(Amicizia amicizia);           // richiedente, ACCETTATA

public enum ParteEvento { TITOLO, DESCRIZIONE, DATE, LUOGO, ARTISTI, MAPPA_INTERNA }
```

- Si chiama DENTRO la transazione di chi modifica i dati, dopo aver salvato la modifica:
  `notificaIscrizione` conta i partecipanti (il nuovo compreso), `notificaAnnullamento` legge il
  motivo dall'evento. Chi chiama ha gia' letto l'evento con lock (sezione 0), che serializza
  anche l'accorpamento.
- `notificaModifica` con `parti` vuote non fa nulla: si passano solo le parti cambiate davvero.
  Le foto non notificano i partecipanti (D10).
- Annullamento da un admin: `notificaAnnullataDaModerazione` (proprietario) +
  `notificaAnnullamento` (partecipanti).
- Richiesta di amicizia mascherata (sezione 8): non chiamare `notificaRichiestaAmicizia`.
  Segnare lette le RICHIESTA quando si accetta o si rifiuta resta a carico dell'area amicizie.
- Testi salvati senza nomi di persone. Per le amicizie il testo si genera alla lettura in
  `NotificaResponse.da(...)` con il nome attuale dell'altro utente: RICHIESTA "Mario Rossi ti ha
  chiesto l'amicizia", ACCETTATA "Mario Rossi ha accettato la tua richiesta di amicizia" (il
  testo di ACCETTATA non e' nella progettazione: scelto in BE2-08).
- Live: per ogni notifica creata o accorpata viene pubblicato un `NotificaLiveEvent(destinatarioId,
  NotificaResponse)` dentro la transazione. Il listener AFTER_COMMIT che lo invia su
  `/user/queue/notifications` arriva con il WebSocket (BE2-14): fino ad allora le notifiche si
  salvano ma non partono live.
- Le notifiche delle chat (NOTIFICA_CHAT) non passano da qui: upsert nella card della chat.

## WebSocket STOMP (`config`, `auth`, `common`) — implementa BE2-09

Configurazione e sicurezza del WebSocket (progettazione v4, sezione 11). Decisione 11.

- Connessione: `ws(s)://<backend>/ws`, WebSocket nativo (niente SockJS), header del CONNECT
  `Authorization: Bearer <token>`. Origini ammesse = `app.cors.allowed-origins` (`ALLOWED_ORIGIN`).
- CONNECT con token mancante, scaduto o revocato, o utente non ATTIVO → frame ERROR con
  header `message` = `TOKEN_NON_VALIDO`, corpo `{ codice, messaggio }`, e connessione chiusa.
- Ammessi solo SEND verso `/app/**` e SUBSCRIBE verso `/user/queue/messages`,
  `/user/queue/notifications`, `/user/queue/errors`. Ogni altro SEND o SUBSCRIBE viene scartato,
  con `{ codice: ACCESSO_NEGATO, messaggio }` su `/user/queue/errors`; la connessione resta aperta.

Per chi scrive i `@MessageMapping` e i push (BE2-14):

```java
// Destinazione del SEND: /app/chats/{chatId}/send (prefisso /app tolto)
@MessageMapping("/chats/{chatId}/send")
public void invia(@DestinationVariable UUID chatId, @Valid @Payload InviaMessaggioRequest req, Principal principal) {
    UtenteAutenticato utente = (UtenteAutenticato) principal; // id, ruolo, jti, scadenza del token
    ...
}

// Push a un utente (dopo il commit): nome dell'utente = il suo id
messagingTemplate.convertAndSendToUser(utenteId.toString(), "/queue/messages", messaggioResponse);
```

- Il Principal della sessione e' l'`UtenteAutenticato` del CONNECT: jti e scadenza per i
  controlli a ogni SEND si leggono da li', non dagli attributi di sessione.
- Errori dei `@MessageMapping`: basta lanciare un'`ApplicazioneException`. `GestoreErroriWebSocket`
  la manda come `{ codice, messaggio }` su `/user/queue/errors` della sola sessione che ha fatto
  il SEND; la validazione del payload diventa `VALIDAZIONE`, il resto `ERRORE_INTERNO`.

## Calcolo di statoAmicizia (pacchetto `friendship`) — implementa BE2-12

`statoAmicizia` e `amiciziaId` di `PartecipanteResponse` in ListaPartecipanti (progettazione v4,
sezioni 7, 8 e 18).

```java
// AmiciziaService
Map<UUID, RelazioneAmicizia> relazioni(UUID utenteId, Collection<Utente> altri);

public record RelazioneAmicizia(StatoAmiciziaVista stato, UUID amiciziaId, UUID chatId) {}
public enum StatoAmiciziaVista { NESSUNA, INVIATA, RICEVUTA, AMICI, NON_DISPONIBILE }
```

- `utenteId` = chi fa la richiesta; `altri` = gli utenti della lista (proprietario compreso), gia'
  caricati: si usa il loro `stato` per la regola "Y non ATTIVO → NON_DISPONIBILE, tranne AMICI".
  Chi fa la richiesta non va messo fra gli altri.
- Una sola query sulle amicizie, per tutta la lista. La mappa ha una voce per ogni utente di
  `altri`, chiave il suo id; senza riga della coppia: `NESSUNA`.
- `amiciziaId` valorizzato con INVIATA, RICEVUTA e AMICI, altrimenti null (sezione 7).
- `chatId`: la chat della coppia se esiste, solo quando c'e' `amiciziaId`; con AMICI e' sempre
  valorizzato. Letta nella stessa query (left join), serve al pulsante "Chat" (decisioni 15 e 20).
- Si chiama dentro la transazione di ListaPartecipanti (o in una propria, readOnly).

```java
Map<UUID, RelazioneAmicizia> relazioni = amiciziaService.relazioni(utenteId, utentiDellaLista);
RelazioneAmicizia r = relazioni.get(utente.getId());   // r.stato(), r.amiciziaId(), r.chatId()
```

## ListaPartecipanti (pacchetto `ticket`) — implementa BE1-17

`GET /api/events/{id}/participants` (progettazione v4, sezione 7; decisione 20 per `chatId`).

```java
public record PartecipanteResponse(UtentePubblicoResponse utente, boolean proprietario,
        StatoAmiciziaVista statoAmicizia, UUID amiciziaId, UUID chatId) {}
```

- Accesso: chi ha un ticket per l'evento o il proprietario (D6), altrimenti 403 `NESSUN_TICKET`;
  evento inesistente 404 `NON_TROVATO`. Lo stesso controllo vale in RichiediAmicizia.
- Ordine: il proprietario in cima (anche se non iscritto), poi i partecipanti per `emesso_il`;
  chi fa la richiesta non compare.
- `statoAmicizia`, `amiciziaId`, `chatId` da `AmiciziaService.relazioni` (una sola query).

---

# Frontend (TEAM-02, passi 5 e 6)

**Stato: concordata.** Le rotte sono quelle del router (`fe/src/router.tsx`, FE2-01) e tutte
hanno la loro pagina; i componenti si importano sempre da qui: nessuno ne scrive una propria
versione.

## Rotte delle pagine

Convenzioni:
- percorsi in inglese e parametri con gli stessi nomi dell'API (`:id` = evento, `:chatId`,
  `:artistaId`), come i percorsi del backend; nomi delle pagine e testi in italiano
- **accesso**: *pubblica* = tutti · *ospite* = solo chi non ha fatto l'accesso (chi l'ha fatto
  va alla home) · *login* = serve l'accesso · *ADMIN* / *SUPERADMIN* = ruolo minimo
- rotta *login* senza accesso → `/login?redirect=<pagina richiesta>`; dopo il login si torna
  lì (FE2-01, passo 4). Lo stesso con un 401 `NON_AUTENTICATO` da qualunque chiamata:
  logout, poi `/login?redirect=...`
- ruolo insufficiente → home con l'avviso "Accesso negato" (`ACCESSO_NEGATO`)
- rotta sconosciuta → pagina 404; risorsa inesistente (API 404 `NON_TROVATO`) → stessa pagina 404

| Rotta | Pagina | Accesso | API principali | Schermata Stitch |
|---|---|---|---|---|
| `/` | Home: hero, carosello, eventi in evidenza | pubblica | ListaEventiMappa | Esplora Eventi & Hero Live |
| `/events` | Esplora eventi: lista, ricerca, "vicino a te" | pubblica | ListaEventiMappa | Esplora Eventi (Lista & Modale Mappa) |
| `/map` | Mappa radar degli eventi | pubblica | ListaEventiMappa | Esplora Eventi & Mappa Radar POI |
| `/events/:id` | Dettaglio evento: foto, line-up, POI, iscrizione; per chi organizza notifica manuale e annullamento; per gli admin la moderazione | pubblica | VediEvento, IscrizioneEvento, InviaNotificaManuale, AnnullaEvento | (pannello della Mappa Radar) |
| `/events/:id/participants` | Partecipanti, con il pulsante amicizia | login (ticket o proprietario) | ListaPartecipanti | Community (colonna Partecipanti) |
| `/events/new` | Crea evento (poi foto, POI, artisti, AI) | login | CreaEvento, CreaFoto, CreaPOI, MiglioraDescrizioneAI | — |
| `/events/:id/edit` | Modifica evento, foto, POI, artisti, descrizione con l'AI | login (proprietario) | ModificaEvento e sotto-risorse, MiglioraDescrizioneAI | — |
| `/my-events` | I miei eventi, anche conclusi e annullati | login | MieiEventi | — |
| `/tickets` | I miei ticket e pass | login | MieiTicket | I Miei Ticket (Snella & Ordinata) |
| `/artists` | Catalogo artisti | pubblica | ListaArtisti | Lineup & Catalogo Artisti |
| `/artists/:artistaId` | Scheda artista | pubblica | VediArtista | — |
| `/cookies` | Cookie Policy: cosa salva il sito nel browser e quali servizi esterni contatta | pubblica | — | — |
| `/friends` | Amici e richieste (ricevute, inviate) | login | ListaAmici, ListaRichieste... | Community (colonna Social) |
| `/chat` | Elenco delle chat | login | ListaChat | Community & Chat |
| `/chat/:chatId` | Conversazione | login | ListaMessaggi, WebSocket | Community & Chat |
| `/notifications` | Notifiche: eventi, amicizie, chat | login | ListaNotifiche..., ContaNonLette | Community, Amicizie & Chat (pannello "Notifiche Feed") |
| `/profile` | Profilo, avatar, password, elimina account | login | VediProfilo, ModificaProfilo, CambioPassword, Anonimizzazione | — |
| `/login` | Accesso | ospite | Login | — |
| `/register` | Registrazione | ospite | Registrazione | — |
| `/verify` | Verifica email con il codice (`?email=`) | ospite | Verifica, ReinviaCodice | — |
| `/forgot-password` | Password dimenticata, poi nuova password con il codice | ospite | PasswordDimenticata, ReimpostaPassword | — |
| `/admin/users` | Utenti: stato; ruolo solo per il SUPERADMIN | ADMIN | ListaUtenti, CambiaStatoUtente, CambiaRuolo | — |
| `/admin/artists` | Catalogo artisti: crea, modifica, disattiva | ADMIN | CreaArtista, ModificaArtista, EliminaArtista | — |
| `*` | Pagina 404 | pubblica | — | — |

Barra di navigazione (FE2-01): Esplora eventi, Mappa, Artisti, Community (amici e chat),
I miei ticket · a destra campanella (`/notifications`, con ContaNonLette), "Crea evento",
menu utente (profilo, i miei eventi, admin se il ruolo lo consente, esci).
La moderazione (annulla evento, rimuovi foto) sta nel dettaglio dell'evento (riquadro
"Moderazione", FE1-16), visibile solo agli ADMIN e mai sui propri eventi: non ha pagine proprie.
Notifica manuale e annullamento di chi organizza stanno anch'essi nel dettaglio (FE1-13).

## Componenti condivisi

### Gia' nel repository (FE1-01, FE1-02)

Import: `@/components/ui` e `@/components/mappa`. Esempi dal vivo nel catalogo
`fe/src/pages/Componenti.tsx`; props documentate nei commenti di ogni file.

| Componente | Props principali |
|---|---|
| `Button` | `variant` primary · gradient · secondary · gold · ghost · danger, `size` sm · md · lg, `icona`, `iconaDopo`, `inCorso`, `pieno` |
| `TextField` / `TextArea` / `Select` / `DateTimeField` | `etichetta`, `aiuto`, `errore`, `obbligatorio`; TextArea con `maxLength` mostra il contatore; Select con `opzioni`, `segnaposto`; DateTimeField con `soloData`, `min`, `max` |
| `ConfirmDialog` | `aperta`, `titolo`, `variante` primary · danger, `inCorso`, `onConferma`, `onAnnulla` |
| `useAvviso()` + `<Avvisi />` | `successo`, `errore`, `info`, `attenzione` (titolo, messaggio) e `erroreApi(errore)`; `<Avvisi />` una sola volta nel layout |
| `Caricamento` / `Scheletro` | `testo`, `riquadro` / `className` per le dimensioni |
| `StatoVuoto` | `icona`, `titolo`, `messaggio`, `azione` |
| `MessaggioErrore` | `errore` (anche l'error di RTK Query), `onRiprova` |
| `Paginazione` | la `PaginaResponse` cosi' com'e' (`{...data}`), `onCambia`, `nomeElementi` |
| `Icon` | `nome` (Material Symbols), `size`, `piena` |
| `Mappa` | `centro`, `zoom`, `marker` (eventi per stato o POI per tipo), `puntoScelto` + `onScegliPunto`, `stile` dark · fiord |
| `IconaEvento` / `IconaPoi` | `stato` + `selezionato` / `tipo` |

Funzioni e tipi: `leggiErrore()` (`@/lib/errori`), `PaginaResponse` e `DIMENSIONE_PAGINA`
(`@/lib/pagine`), tipi dei DTO da `@/types/api`, dati finti MSW in `fe/src/mocks/`.

### Login e chiamate API (FE2-01, FE2-02)

- **Endpoint**: sempre nell'unica API `apiSlice` (`@/store/apiSlice`), con `injectEndpoints`
  dalla cartella della funzionalita' (es. `features/eventi/apiEventi.ts`). Token
  (`Authorization: Bearer`) e 401 li gestisce la sua `baseQuery`: nessuna API separata.
- **401 `NON_AUTENTICATO`**: sessione chiusa, cache svuotata, avviso "Sessione scaduta" e
  `/login?redirect=<pagina>`. Sul login il 401 e' `CREDENZIALI_ERRATE` e non fa uscire.
- **Chi ha fatto l'accesso**: `useSessione()` (`@/hooks/useSessione`) →
  `{ utente, loggato, admin, superadmin }`. Proprietario e iscrizione di un evento si
  leggono da `sonoProprietario` / `sonoIscritto` della risposta, non da qui.
- **Stato** (Redux, `@/store/sessioneSlice`): `accesso(loginResponse)` dopo Login e Verifica,
  `utenteAggiornato(utente)` dopo ModificaProfilo, `uscita()` per "Esci". Salvato in
  localStorage; all'avvio `GET /api/users/me` aggiorna l'utente; alla scadenza del token e
  dopo login o uscita in un'altra scheda la sessione si allinea da sola.
- **Accesso alle pagine**: rotte contenitore `SoloConLogin`, `SoloOspiti`,
  `SoloRuolo minimo="ADMIN"` in `src/router.tsx` (`@/components/layout`); dopo il login si
  torna al `?redirect=` (`urlLogin()`, `percorsoDopoLogin()` in `@/lib/dopoLogin`).

### WebSocket (FE2-11)

- **Connessione**: una sola per tutta l'app, la apre `ConnessioneLive` (in `App.tsx`) finche'
  c'e' una sessione, con il token nel CONNECT; si riconnette da sola e dopo una riconnessione
  ricarica ContaNonLette, chat e notifiche (decisione 22). Le pagine non la aprono.
- **Ricevere**: `iscriviti<T>(coda, callback)` da `@/lib/websocket`, dentro un `useEffect`; la
  funzione restituita annulla l'iscrizione. Il corpo arriva gia' convertito dal JSON e
  l'iscrizione resta valida anche dopo una riconnessione.
  `useEffect(() => iscriviti<MessaggioResponse>('/user/queue/messages', (m) => ...), [])`
- **Inviare**: `invia('/app/chats/{chatId}/send', { testo })` → `false` se in quel momento non
  c'e' connessione (il messaggio non parte). Gli errori arrivano su `/user/queue/errors`
  (`ErroreWebSocket`); `TOKEN_NON_VALIDO` lo gestisce gia' `ConnessioneLive`.
- **Stato**: `useStatoConnessione()` → `assente` · `connessione` · `connesso` · `riconnessione`,
  per l'indicatore della schermata Community & Chat.
- **Notifiche live** (FE2-13): le riceve gia' `useNotificheLive` (chiamato da `ConnessioneLive`)
  in tutta l'app: avviso a comparsa, badge della campanella, lista della categoria e, per gli
  eventi, dettaglio/POI/foto ricaricati (decisione 23). Le pagine non si iscrivono di nuovo.
- **Dati finti**: `mocks/handlers/websocket.ts` fa da server STOMP; per simulare un arrivo live
  `pubblicaFinto(utenteId, 'messages' | 'notifications' | 'errors', corpo)`.

### Da realizzare (nomi e props concordati qui)

**`PulsanteAmicizia`** (`@/components/amicizia`): un utente e la relazione con lui, come
arrivano in `PartecipanteResponse`. Lo usano la lista partecipanti e le pagine amici e chat.

```ts
type PulsanteAmiciziaProps = {
  utente: UtentePubblicoResponse
  statoAmicizia: StatoAmicizia
  amiciziaId: Uuid | null
  /** Evento in comune: serve a RichiediAmicizia { riceventeId, eventoId } */
  eventoId: Uuid
  /** Dopo ogni azione riuscita, con il nuovo stato: la pagina aggiorna la lista */
  onCambio?: (stato: StatoAmicizia, amiciziaId: Uuid | null) => void
}
```

| statoAmicizia | Mostra | Azione |
|---|---|---|
| `NESSUNA` | "Aggiungi" | RichiediAmicizia |
| `INVIATA` | "In attesa" + "Ritira" | RitiraRichiesta |
| `RICEVUTA` | "Accetta" / "Rifiuta" | AccettaAmicizia / RifiutaAmicizia |
| `AMICI` | "Chat" | apre `/chat/:chatId` (`chatId` di `PartecipanteResponse`, decisione 20) |
| `NON_DISPONIBILE` | niente | — |

Con `utente.attivo = false` nessun pulsante, tranne "Chat" per chi e' gia' amico (sola lettura).
Errori `RICHIESTA_GIA_RICEVUTA`, `GIA_AMICI`, `CONFLITTO`: si ricarica lo stato con `onCambio`.

**`CardEvento`** (`@/components/eventi`): la card delle liste (home, esplora, i miei eventi),
come nelle schermate Stitch.

```ts
type CardEventoProps = {
  evento: EventoMappaResponse
  /** Pulsanti in basso, es. "Dettagli" e "Iscriviti"; senza, la card intera porta al dettaglio */
  azioni?: ReactNode
}
```

**`BadgeStato`** (`@/components/eventi`): `{ stato: StatoEvento }`, pillola con il colore dello
stato (stessi colori di `STILE_STATO` della mappa). Usato da card, dettaglio e ticket.

## Punti chiusi

- **`chatId` in `PartecipanteResponse`**: aggiunto in BE1-17 (decisione 20), con la stessa regola
  di `amiciziaId`; con `statoAmicizia = AMICI` c'e' sempre.
