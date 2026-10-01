# NoseY - Decisioni tecniche

Una sezione per ogni decisione presa dal team.

## Decisione 1: Redux Toolkit per lo stato del frontend

### Scelta

Redux Toolkit (`@reduxjs/toolkit` + `react-redux`) come gestore dello stato del frontend,
con RTK Query per le chiamate al backend. Lo store sta in `fe/src/store/`, gli hook tipizzati
(`useAppDispatch`, `useAppSelector`) in `fe/src/hooks/redux.ts`.

### Motivazione

- NoseY ha stato condiviso fra molte schermate: utente autenticato, notifiche live, chat,
  richieste di amicizia. Uno store unico evita di passare i dati di componente in componente.
- I messaggi in tempo reale (notifiche, chat) si possono scrivere direttamente nello store.
- RTK Query gestisce cache, caricamento, errori e invalidazione dei dati dopo le modifiche,
  senza scrivere a mano `useEffect` + `fetch` per ogni chiamata.
- Usa la stessa base di `src/lib/api.ts` (`VITE_API_URL`), quindi il proxy in locale e il
  deploy su Render funzionano senza configurazioni aggiuntive.

### Alternative scartate

- **TanStack Query + Context di React**: piu' leggero, ma lo stato live (notifiche, chat)
  andrebbe gestito a parte con piu' Context.
- **Solo Context + `useState`**: sufficiente per poco stato, ma diventa difficile da mantenere
  con molte funzionalita' e piu' persone che ci lavorano.

## Decisione 2: JWT con jjwt, segreto senza valore di default

### Scelta

I token si firmano con la libreria jjwt (`jjwt-api`, `jjwt-impl`, `jjwt-jackson`), algoritmo
HS256 fissato nel codice. Il segreto arriva solo da `JWT_SECRET` (almeno 32 caratteri):
`application.yml` non ha un valore di default. Su Render lo genera il blueprint
(`generateValue: true`); in locale va impostato nella configurazione di avvio.
L'utente in memoria che Spring Boot creerebbe da solo e' disattivato
(`UserDetailsServiceAutoConfiguration` esclusa): l'autenticazione passa solo dal JWT.

### Motivazione

- jjwt e' la libreria vista nel corso ed e' la piu' diffusa per firmare e leggere JWT.
- Con l'algoritmo non fissato jjwt lo sceglierebbe in base alla lunghezza del segreto
  (HS256, HS384 o HS512): meglio un comportamento prevedibile.
- Un segreto scritto nel repository sarebbe pubblico: chiunque potrebbe firmare token validi.
  Senza default, se la variabile manca l'app non parte invece di girare con un segreto noto.

### Alternative scartate

- **Nimbus JOSE (spring-security-oauth2-jose)**: integrato in Spring Security, ma pensato per
  resource server OAuth2 e piu' verboso per un token firmato con un segreto condiviso.
- **Segreto di default in `application.yml` solo per lo sviluppo**: comodo, ma finirebbe in
  produzione appena qualcuno dimentica di impostare la variabile.

## Decisione 3: interfaccia EmailService, con un profilo per la versione finta

### Scelta

Un'unica interfaccia `EmailService` (pacchetto `mail`) con 4 metodi, uno per ogni email del
progetto (codice di verifica, ticket, codice di reset, password cambiata), parametri primitivi
(non entita'). Due implementazioni, scelte da un profilo Spring:
- `LogEmailService` (default, senza profilo "smtp"): scrive l'email nel log invece di inviarla,
  per poter sviluppare senza credenziali SMTP vere.
- `SmtpEmailService` (profilo "smtp", da attivare quando servono invii reali in locale):
  Gmail SMTP con password per le app, variabili `MAIL_USERNAME` e `MAIL_PASSWORD`.
`BrevoEmailService` (produzione, API HTTP) resta fuori da questa card: e' un'implementazione
successiva della stessa interfaccia.

I corpi delle 4 email sono template Thymeleaf (HTML), renderizzati da `SmtpEmailService` con
`TemplateEngine` e inviati come `MimeMessage`. `LogEmailService` resta indipendente dai
template: logga solo destinatario, tipo email e dati chiave, non l'HTML renderizzato — la resa
grafica precisa dei template si rifinisce in una fase successiva.

### Motivazione

- Un'interfaccia sola disaccoppia chi invia l'email (i servizi applicativi) da come viene
  inviata: cambiare implementazione non tocca il codice chiamante.
- Parametri primitivi invece delle entita' (es. niente `Utente` o `Partecipante` nella firma):
  l'email non deve conoscere JPA, e il messaggio testuale resta stabile anche se lo schema cambia.
- La versione finta nel log permette di lavorare da subito (registrazione, reset password, ecc.)
  senza dover configurare un account Gmail con password per le app fin dal primo giorno.
- Il profilo Spring, non una variabile letta a mano, e' il modo standard per scegliere
  l'implementazione: e' visibile in `application.yml` ed e' lo stesso meccanismo gia' usato
  nel progetto per distinguere locale/produzione.

### Alternative scartate

- **Solo SmtpEmailService, senza versione finta**: costringerebbe ad avere credenziali Gmail
  valide fin dai primi test, anche per funzionalita' che non riguardano le email.
- **Flag booleano invece di un profilo** (es. `app.mail.finta=true`): funzionerebbe, ma il
  progetto usa gia' i profili Spring per la stessa distinzione locale/produzione (vedi
  `EmailService` in sezione 0 della progettazione, gia' pensato per due implementazioni
  "scelte dal profilo").

## Decisione 4: immagini salvate nel database, non su Cloudinary

### Scelta

Le immagini (avatar utente, foto evento, immagine artista) si salvano come `bytea` nelle
tabelle stesse (`utente.immagine_profilo`, `foto_evento.contenuto`, `artista.immagine`), con
una colonna `*_content_type` accanto per il MIME type. Niente `url`/`public_id` esterni, niente
account Cloudinary. Migrazione `V2__immagini_nel_database.sql`.

`StorageService` (pacchetto `common`, BE1-05) e' stato adattato di conseguenza: non carica/cancella
niente su un sistema esterno, valida solo presenza, dimensione e tipo (sui primi byte: JPEG, PNG,
WEBP) e restituisce i byte pronti da salvare nella colonna della entita' (`ImmagineValidata`).
Gli item "upload fuori dalla transazione, con cancellazione del file se il salvataggio fallisce"
e "cancellazione dallo storage dopo il commit" della card originale non si applicano piu' alla
lettera: non c'e' una chiamata di rete lenta da tenere fuori transazione ne' un file su un altro
sistema da cancellare a parte — salvare o cancellare il `byte[]` e' la stessa scrittura sul
database di qualunque altro campo dell'entita', dentro la stessa transazione.

### Motivazione

- Il team non ha mai configurato Cloudinary e non vuole gestire credenziali/account esterni
  per la portata di questo progetto didattico.
- Il database Postgres gestito (es. su Render) e' persistente: a differenza del filesystem
  del servizio applicativo (effimero, sezione 18 della progettazione), non serve uno storage
  esterno solo per sopravvivere ai riavvii/deploy.
- Meno pezzi mobili: un solo sistema (il DB) da cui leggere e su cui scrivere, niente chiamata
  di rete separata fuori transazione da gestire per l'upload.

### Alternative scartate

- **Cloudinary (previsto dalla progettazione v4)**: resta la soluzione "giusta" per un progetto
  in produzione con molto traffico, ma il team ha scelto di non configurarla per restare
  focalizzati sulle funzionalita' core nel tempo a disposizione.
- **Base64 in una colonna `text`**: piu' semplice da vedere a occhio, ma spreca circa il 33% di
  spazio in piu' rispetto a `bytea` e non ha vantaggi concreti qui.

## Decisione 5: solo Tailwind, senza librerie di componenti

### Scelta

Nessuna libreria di componenti: i componenti comuni (pulsante, campi, select, data e ora,
finestra di conferma, avviso a comparsa, caricamento, stato vuoto, errore, paginazione) li
scriviamo noi in `fe/src/components/ui/`, con Tailwind e i token del design system Stitch
definiti in `fe/src/index.css`. Dove esiste, si usa l'elemento nativo del browser:
`<dialog>` per la finestra di conferma, `<select>`, `<input type="datetime-local">`.

Tutti e due i frontend importano i componenti da `@/components/ui`: nessuno ne riscrive
una propria versione nella sua pagina.

### Motivazione

- La grafica e' gia' definita su Stitch, con colori, font e spaziature propri: una libreria
  andrebbe comunque ristilizzata da capo per assomigliarle.
- Gli elementi nativi danno gratis tastiera, focus e accessibilita' (`<dialog>` chiude con
  Esc e blocca il resto della pagina), senza dipendenze in piu'.
- Pochi file brevi, scritti da noi: chiunque del team li legge e li modifica.

### Alternative scartate

- **Headless UI**: comportamento accessibile gia' pronto, ma per i componenti che servono
  a NoseY bastano gli elementi nativi; si puo' aggiungere in seguito se servisse
  (es. un Combobox con ricerca).
- **shadcn/ui, Mantine e simili**: molti componenti pronti, ma con uno stile proprio da
  riadattare a Stitch e molto codice o dipendenze che non useremmo.

## Decisione 6: limiti di frequenza con una mappa di timestamp, senza Bucket4j

### Scelta

`LimitiService` (pacchetto `common`) tiene in memoria, per ogni limite e ogni chiave, gli istanti
degli eventi dentro la finestra (una `ConcurrentHashMap` di code). La finestra scorre: "10 in
15 minuti" = negli ultimi 15 minuti, "al giorno" = nelle ultime 24 ore. I valori stanno in
`application.yml` sotto `app.limiti`; se un limite manca o non e' valido l'app non parte.
Una pulizia `@Scheduled` ogni 10 minuti toglie le chiavi senza eventi recenti.

### Motivazione

- La progettazione ammette entrambe le soluzioni (sezione 0); la mappa non richiede una nuova
  dipendenza nel `pom.xml` condiviso.
- Il login conta solo i tentativi falliti e li azzera dopo un login riuscito: con i timestamp
  e' naturale (`controlla` / `registra` / `azzera`), con i gettoni di Bucket4j andrebbe forzato.
- La finestra che scorre corrisponde alla lettera ai limiti della progettazione.

### Alternative scartate

- **Bucket4j**: libreria solida, ma un'altra dipendenza e un modello (token bucket) che
  approssima "N in una finestra" invece di contarli.
- **Limiti nel database**: sopravvivrebbero ai riavvii, ma aggiungono scritture a ogni
  richiesta; la progettazione accetta l'azzeramento al riavvio con una sola istanza.

## Decisione 7: nome del vincolo violato letto dal driver PostgreSQL

### Scelta

Per scegliere il codice di un 409 (es. `uq_utente_email` → `EMAIL_GIA_REGISTRATA`), il
`GestoreErrori` legge il nome del vincolo da `PSQLException.getServerErrorMessage().getConstraint()`
e solo se manca usa quello estratto da Hibernate. Per questo il driver `postgresql` nel `pom.xml`
non e' piu' solo `runtime`.

### Motivazione

- Hibernate ricava il nome cercandolo nel testo del messaggio in inglese
  ("violates unique constraint"). Con un PostgreSQL installato in italiano ("viola il vincolo
  univoco") non lo trova, e in locale ogni 409 diventava `CONFLITTO`.
- PostgreSQL manda il nome del vincolo anche in un campo a parte dell'errore, uguale in tutte
  le lingue: funziona in locale e su Render senza configurare niente.

### Alternative scartate

- **`ALTER DATABASE ... SET lc_messages TO 'C'` su ogni PC**: nessuna modifica al codice, ma
  ognuno deve ricordarsene e un database ricreato torna in italiano.
- **Forzare `lc_messages` dalla configurazione dell'app**: cambiarlo e' permesso solo agli
  amministratori del database; su Render l'utente non lo e' e le connessioni fallirebbero.

## Decisione 8: mappe con MapLibre GL e OpenFreeMap

### Scelta

Le mappe (eventi vicini, posizione dell'evento, POI interni) usano **MapLibre GL**
(`maplibre-gl`) con il binding React **react-map-gl** (`import ... from 'react-map-gl/maplibre'`).
Le tessere sono vettoriali e arrivano da **OpenFreeMap** (dati OpenStreetMap), con gli stili
scuri `dark` (predefinito) e `fiord`, in tinta con la grafica Stitch:
`https://tiles.openfreemap.org/styles/dark` e `https://tiles.openfreemap.org/styles/fiord`.
Il componente comune sta in `fe/src/components/mappa/`.

L'attribuzione ("OpenFreeMap © OpenMapTiles Data from OpenStreetMap") e' sempre visibile,
come richiede la licenza ODbL di OpenStreetMap.

### Motivazione

- Tutto gratuito e senza chiavi API ne' registrazione: niente segreti da gestire nel frontend,
  che e' pubblico.
- Mappe vettoriali: lo stile scuro e' nativo (colori definiti nello stile), non un filtro CSS
  applicato a immagini chiare; zoom fluido e testi nitidi.
- react-map-gl permette di scrivere mappa, marker e popup come componenti React, compatibile
  con React 19.

### Alternative scartate

- **Leaflet + react-leaflet con tessere raster OpenStreetMap**: piu' leggero, ma le tessere
  OSM sono chiare (servirebbe un filtro CSS per scurirle) e l'uso dei server OSM ha limiti
  stretti per le applicazioni.
- **CARTO, MapTiler, Stadia**: stili scuri pronti, ma servizi commerciali con registrazione,
  chiave API o limiti del piano gratuito.
- **Google Maps**: richiede chiave API e carta di credito anche per il piano gratuito.

## Decisione 9: immagini servite da un GET pubblico, con URL relativo e versione

### Scelta

Con le immagini nel database (decisione 4) il backend le restituisce da un **GET pubblico**
che risponde con i byte e il loro `Content-Type` (404 `NON_TROVATO` se l'immagine non c'e').
Per l'avatar: `GET /api/users/{utenteId}/avatar`, aggiunto ai percorsi pubblici di `SecurityConfig`.

Nei DTO il campo dell'immagine e' il **percorso relativo** di quel GET, con un parametro `v`
che cambia con il contenuto, oppure `null` se l'immagine non c'e':
`immagineProfilo = "/api/users/{id}/avatar?v=0cb988d042a7f28d"`. Il frontend lo usa come ogni altra
chiamata: `<img src={`${BASE}${immagineProfilo}`}>`. La costruzione sta in
`UtenteResponse.urlImmagineProfilo`, da riusare in `UtentePubblicoResponse`.

La risposta ha `Cache-Control: no-cache` e `ETag` uguale a `v`: il browser ricontrolla ogni
volta e, se l'immagine non e' cambiata, riceve 304 senza corpo.

Foto degli eventi (`FotoResponse.url`, `copertinaUrl`) e immagini degli artisti
(`ArtistaResponse.immagineUrl`) seguono lo stesso schema, con un GET pubblico ciascuna.

**Versione e byte pigri.** `v` sono i primi 16 caratteri esadecimali dell'MD5 dei byte
(`VersioneContenuto`), salvati in una colonna accanto all'immagine (`immagine_profilo_versione`,
`foto_evento.versione`, `artista.immagine_versione`, migrazione V3). La scrive il setter dei byte
dell'entita', quindi byte e versione non possono restare disallineati. I byte sono
`@Basic(fetch = LAZY)`, grazie a `hibernate-maven-plugin` nel `pom.xml`: si leggono dal database
solo nel GET dell'immagine. Per sapere se un'immagine c'e' si controlla la versione, mai i byte,
altrimenti si leggerebbero lo stesso.

### Motivazione

- Un tag `<img>` non puo' mandare l'header `Authorization`: con un GET protetto le immagini
  non si vedrebbero senza lavoro extra nel frontend.
- Il percorso relativo segue la stessa regola delle altre chiamate (`BASE` vuota in sviluppo
  con il proxy di Vite, `VITE_API_URL` in produzione): il backend non deve conoscere il proprio
  indirizzo pubblico.
- `v` cambia con l'immagine: dopo un nuovo upload il browser non mostra quella vecchia dalla
  cache, e il frontend non deve aggiungere nulla all'URL.
- Senza byte pigri ogni lettura di un utente, di una foto o di un artista porterebbe con se'
  l'immagine (fino a 2 o 5 MB): a ogni login, e per ogni elemento di liste e mappa. MD5 invece di
  CRC32 perche' Postgres ha `md5()`: la migrazione calcola lo stesso valore di Java per le righe
  gia' esistenti.
- Gli id sono UUID: l'immagine di un utente si raggiunge solo conoscendone l'id, che compare
  gia' nelle risposte dove l'utente e' visibile.

### Alternative scartate

- **Data URI (base64) nel JSON**: nessun endpoint in piu', ma ogni utente peserebbe fino a
  ~2,7 MB nella risposta, e una lista di partecipanti o amici diventerebbe enorme.
- **GET protetto dal token + blob nel frontend**: nessuna immagine pubblica, ma il frontend
  dovrebbe scaricare ogni immagine con `fetch` e creare un URL blob per mostrarla.
- **Byte in tabelle separate** (invece del campo pigro): niente plugin nel `pom.xml`, ma una
  migrazione piu' grossa e nuove entita' e repository solo per i byte.
- **Versione calcolata dai byte a ogni risposta**: niente colonna in piu', ma per costruire
  l'URL bisognerebbe leggere l'immagine intera.

## Decisione 10: test di integrazione sul database PostgreSQL locale

### Scelta

- `spring-boot-starter-test` nel `pom.xml`, solo con scope `test`.
- I test del backend sono `@SpringBootTest` sul database locale di `application.yml` (serve
  anche `JWT_SECRET`), con `@Transactional`: ogni test viene annullato alla fine e non lascia dati.
- Il primo e' `NotificheServiceImplTest` (BE2-08): accorpamento, testi e push live.

### Motivazione

- Le regole da verificare (accorpamento, enum di Postgres, vincoli) dipendono dal database vero:
  un mock dei repository non le proverebbe.
- Lo schema lo crea Flyway con `ddl-auto: validate`: il test usa le stesse migrazioni
  dell'applicazione.
- Nessuna dipendenza oltre allo starter e nessun Docker richiesto.

### Alternative scartate

- **H2 in memoria**: non ha gli enum di Postgres ne' la sintassi di alcune migrazioni.
- **Testcontainers**: database pulito a ogni esecuzione, ma richiede Docker su ogni PC del team
  e altre dipendenze.
- **Solo unit test con Mockito**: piu' veloci, ma l'accorpamento verificato solo su mock.

---

## Decisione 11: WebSocket nativo, frame vietati scartati senza chiudere la connessione

### Scelta

- STOMP su WebSocket nativo all'indirizzo `/ws`, senza SockJS. Il frontend usa `@stomp/stompjs`.
- Origini ammesse per l'handshake: la stessa proprieta' del CORS, `app.cors.allowed-origins`
  (variabile `ALLOWED_ORIGIN`), non una nuova `FRONTEND_URL` come nella sezione 11.
- jti e scadenza del token restano nel Principal della sessione (`UtenteAutenticato`), non
  vengono copiati negli attributi di sessione come indica la sezione 11.
- SEND o SUBSCRIBE verso una destinazione non ammessa: il frame viene scartato e l'errore
  `ACCESSO_NEGATO` va su `/user/queue/errors`, senza chiudere la connessione. Solo un CONNECT non
  valido (o un frame senza CONNECT valido) riceve un frame ERROR, che chiude la connessione:
  header `message` = codice, corpo `{ codice, messaggio }`.
- Nessuna dipendenza `spring-security-messaging`: i controlli sono in un `ChannelInterceptor`.
- `WebSocketSicurezzaTest` non e' `@Transactional` (decisione 10): il server legge il database
  da altri thread, quindi i dati si salvano davvero e si cancellano alla fine di ogni test.

### Motivazione

- Tutti i browser supportano il WebSocket e Render accetta le connessioni WebSocket: SockJS
  aggiungerebbe una dipendenza al frontend e URL diversi (`/ws/...`) senza un caso reale.
- Una sola variabile per le origini evita che CORS e WebSocket vadano fuori sincrono su Render.
- `UtenteAutenticato` contiene gia' jti e scadenza: una copia negli attributi andrebbe tenuta
  allineata senza nessun vantaggio.
- Il frontend non manda mai frame verso destinazioni vietate: se succede e' un errore di
  programmazione, e chiudere la connessione costringerebbe a riconnettersi e ricaricare tutto.
  Un CONNECT senza token valido invece non ha una sessione da tenere aperta.
- Il frame ERROR di default contiene il messaggio dell'eccezione, con dettagli interni.
- `spring-security-messaging` attiverebbe anche il controllo CSRF sul CONNECT, inutile con il
  token nell'header.

### Alternative scartate

- **SockJS**: utile solo per browser o proxy senza WebSocket.
- **Frame ERROR per ogni destinazione vietata**: piu' semplice, ma chiude la connessione.
- **`@EnableWebSocketSecurity` con regole sulle destinazioni**: piu' configurazione e CSRF sul
  CONNECT, per controlli che stanno in poche righe.

---

## Decisione 12: React Router per la navigazione del frontend

### Scelta

**React Router** (`react-router`, versione 8) in modalita' "data router": le rotte stanno in
un unico file, `fe/src/router.tsx`, creato con `createBrowserRouter` e passato a
`<RouterProvider>` in `main.tsx`. `App.tsx` e' la radice di tutte le rotte e contiene il
layout comune (`<Outlet />` per la pagina). L'elenco delle rotte e' quello di
`docs/interfacce.md`; le pagine non ancora fatte usano `PaginaProvvisoria`, che ogni card
sostituisce con la pagina vera.

### Motivazione

- E' il router piu' diffuso per React: documentazione ed esempi abbondanti.
- Un solo file con tutte le rotte: chi apre il progetto vede subito pagine, percorsi e accessi.
- Rotte annidate: il layout (barra di navigazione, footer) e i controlli di accesso (login,
  ospite, ruolo) si scrivono una volta sola come rotte "padre".
- Il sito statico su Render rimanda gia' ogni percorso a `index.html` (`render.yaml`), quindi
  gli URL "veri" (`/events/123`) funzionano anche ricaricando la pagina.

### Alternative scartate

- **TanStack Router**: tipi piu' rigorosi sui parametri, ma meno conosciuto dal team e con
  piu' configurazione.
- **Navigazione a mano con lo stato di React**: niente URL condivisibili, niente tasto
  "indietro" del browser.

---

## Decisione 13: la richiesta mascherata aggiorna anche evento e data

### Scelta

- In RichiediAmicizia (sezione 8), con la riga della coppia RIFIUTATA chiusa dal ricevente e
  non mascherata, oltre a `richiesta_mascherata = true` si aggiornano anche `evento_id`
  (l'evento della nuova richiesta) e `aggiornata_il`. Stato, `chiusa_da` e ricevente restano
  quelli del rifiuto, e non parte nessuna notifica, come da progettazione.
- Lo stato visto da chi chiede (`statoAmicizia`, sezione 8) e' l'enum `StatoAmiciziaVista`
  (`NESSUNA | INVIATA | RICEVUTA | AMICI | NON_DISPONIBILE`): il nome `StatoAmicizia` e' gia'
  quello dello stato salvato nel database.

### Motivazione

- Il rifiuto deve restare invisibile (D7). Con il solo flag, la risposta e ListaRichiesteInviate
  mostrerebbero l'evento della richiesta vecchia, e la richiesta resterebbe nella posizione
  vecchia dell'ordinamento per `aggiornata_il`: chi chiede potrebbe intuire il rifiuto.

### Alternative scartate

- **Solo `richiesta_mascherata = true`** (testo letterale della sezione 8): risposta con un
  `eventoId` diverso da quello appena inviato.
- **Risposta con l'evento nuovo ma riga invariata**: la risposta e le liste successive non
  coinciderebbero.

---

## Decisione 14: ordine di ListaAmici e utenti non attivi nelle liste delle amicizie

### Scelta

- ListaAmici (sezione 8, "per nome dell'amico"): per nome, a parita' di nome per cognome, senza
  distinguere maiuscole e minuscole. L'ordine si fa in Java, dopo la query.
- Le tre liste (amici, richieste ricevute, richieste inviate) includono anche gli utenti sospesi
  o anonimizzati, con `altroUtente.attivo = false`: il frontend disattiva i pulsanti, come per
  `statoAmicizia`.

### Motivazione

- L'ordine in Java non dipende dalla collation del database (in locale e su Render puo' essere
  diversa): stesso risultato ovunque.
- La sezione 8 non chiede di escludere nessuno: una richiesta ricevuta da un utente poi sospeso
  resta visibile, e accettarla da' 409 UTENTE_NON_ATTIVO come da progettazione.

### Alternative scartate

- **ORDER BY nella query** (con CASE sull'altro utente): l'ordine delle maiuscole dipenderebbe
  dalla collation di Postgres.
- **Nascondere gli utenti non attivi**: non previsto dalla progettazione, e un amico sospeso
  sparirebbe mentre la chat resta in sola lettura.

---

## Decisione 15: chatId pronto nel calcolo di statoAmicizia

### Scelta

- `RelazioneAmicizia` (il calcolo di `statoAmicizia` che BE1 usa in ListaPartecipanti) ha anche
  `chatId`: la chat della coppia, letta con un left join nella stessa query sulle amicizie.
- `chatId` e' valorizzato, se la chat esiste, solo quando lo e' `amiciziaId` (INVIATA, RICEVUTA,
  AMICI); con AMICI c'e' sempre. Con NESSUNA e NON_DISPONIBILE e' null.
- `PartecipanteResponse` (sezione 7) non cambia qui: aggiungere `chatId` alla risposta resta una
  scelta di BE1 e del team (punto aperto in `docs/interfacce.md`).

### Motivazione

- Il pulsante "Chat" della lista partecipanti deve aprire `/chat/:chatId`, ma la sezione 7 da'
  solo `amiciziaId`. Con il dato gia' nel calcolo, aggiungerlo alla risposta non costa query in
  piu' (sezione 18: una sola query sulle amicizie).
- Stessa regola di `amiciziaId`: chi vede NESSUNA o NON_DISPONIBILE non riceve id della coppia.

### Alternative scartate

- **Niente `chatId`** (testo letterale della sezione 7): il frontend dovrebbe chiamare anche
  ListaAmici solo per trovare la chat.
- **`chatId` sempre, se la chat esiste** (come in `AmiciziaResponse`): con NON_DISPONIBILE
  darebbe un id della coppia mentre `amiciziaId` e' null.

---

## Decisione 16: ordine di ListaChat per ultima attivita'

### Scelta

- ListaChat (sezione 9, "per ultimo messaggio dal piu' recente, quelle senza messaggi per
  creata_il"): un solo ordinamento decrescente sull'ultima attivita' della chat, cioe'
  `ultimoMessaggio.inviatoIl`, oppure `creataIl` se la chat non ha messaggi. A parita' di istante
  decide l'id della chat, per avere lo stesso ordine a ogni chiamata.
- L'ordine si fa in Java, dopo le query (chat, ultimi messaggi, non letti).

### Motivazione

- Una chat appena aperta (amicizia appena accettata) compare in cima, accanto alle conversazioni
  recenti, invece di finire in fondo sotto chat ferme da mesi.
- Ultimo messaggio e non letti arrivano da query separate (una ciascuna per tutta la lista):
  ordinare in Java evita una query unica con subquery correlate solo per l'ORDER BY.

### Alternative scartate

- **Prima le chat con messaggi, poi quelle vuote per creata_il**: una chat nuova resterebbe in
  fondo alla lista finche' nessuno scrive.
- **ORDER BY nella query** con `coalesce` sull'ultimo messaggio: serve una subquery correlata per
  ogni chat, e l'ultimo messaggio va letto comunque per la risposta.

---

## Decisione 17: validazione di InviaMessaggio nel service

### Scelta

- Il payload di InviaMessaggio (`SEND /app/chats/{chatId}/send`) non usa `@Valid` nel controller
  STOMP ed e' facoltativo (`@Payload(required = false)`): `ChatService.invia` lo valida con il
  `Validator` di Jakarta, dopo il controllo del token e il limite di frequenza.
- Corpo mancante o testo non valido danno lo stesso errore: `VALIDAZIONE` su `/user/queue/errors`.

### Motivazione

- La sezione 11 fissa l'ordine dei controlli: token, limite, testo, membro, sola lettura. Con
  `@Valid` Spring valida il payload prima di chiamare il metodo, quindi un token revocato con un
  testo vuoto darebbe `VALIDAZIONE` invece di `TOKEN_NON_VALIDO`, e i messaggi non validi non
  conterebbero nel limite.
- Le annotazioni restano sul record `InviaMessaggioRequest`: le regole si leggono nello stesso
  posto dei DTO HTTP.

### Alternative scartate

- **`@Valid` sul payload** (come nei controller HTTP): non rispetta l'ordine della sezione 11.
- **Token e limite nel `JwtChannelInterceptor`**: il limite riguarda solo i messaggi di chat, non
  ogni SEND, e gli errori dell'interceptor non passano da `GestoreErroriWebSocket`.
- **Controllo a mano del testo** (`isBlank`, lunghezza): duplicherebbe le annotazioni del record.

---

## Decisione 18: Google Gemini per il miglioramento della descrizione

### Scelta

- MiglioraDescrizioneAI (BE1-15) usa Google Gemini, modello `gemini-3.5-flash`, tramite l'API REST
  `generateContent`, chiamata con `RestClient`: nessuna dipendenza nuova nel `pom.xml`.
- Nella stessa richiesta vanno la foto, in base64, e la descrizione. Le regole del testo (lingua,
  niente dati inventati, niente Markdown) stanno nelle istruzioni di sistema.
- Chiave in `GEMINI_API_KEY` (la sezione 18 della progettazione indica `AI_API_KEY`, nome
  indicativo: si usa quello del provider), modello sovrascrivibile con `AI_MODELLO`, timeout di 30 secondi. Senza
  chiave, o con qualsiasi errore del servizio, la risposta e' 502 `SERVIZIO_ESTERNO`: nessuna
  implementazione finta.
- Il database si legge in una transazione di sola lettura che si chiude prima della chiamata a
  Gemini.

### Motivazione

- Piano gratuito con la sola chiave API, senza carta di credito, come per le altre scelte del team
  (decisioni 4 e 8). Italia tra i Paesi in cui l'API e' disponibile.
- Accetta JPEG, PNG e WEBP, gli stessi formati delle foto degli eventi; il limite di 20 MB per
  richiesta e' molto sopra le nostre foto da 5 MB.
- Provato con una chiamata reale: `gemini-3.5-flash` risponde in circa 10 secondi e usa davvero il
  contenuto della foto. `gemini-2.5-flash` risponde 404 anche se compare nell'elenco dei modelli.
- I nomi dei modelli cambiano spesso: il modello sta nella configurazione, non nel codice.
- Una chiamata esterna lunga dentro una transazione terrebbe occupata una connessione del pool.

### Alternative scartate

- **OpenAI, Anthropic Claude**: a pagamento, serve credito o carta di credito.
- **Groq (Llama vision)**: gratuito, ma con limiti piu' stretti e modelli con immagini che cambiano spesso.
- **Implementazione finta senza chiave** (come `LogEmailService`): una proposta finta in locale
  nasconderebbe una chiave mancante; con il 502 il frontend prova anche il caso di errore.
- **SDK di Google** (`google-genai`): una dipendenza in piu' per una sola chiamata HTTP.

Nota: sul piano gratuito Google puo' usare i contenuti inviati per migliorare i suoi prodotti.
Accettato: foto e descrizioni degli eventi sono gia' pubbliche sulla mappa.

---

## Decisione 19: il 429 della notifica manuale dopo il controllo del proprietario

### Scelta

- In InviaNotificaManuale (BE1-16) il limite `NOTIFICHE_MANUALI` (5 in 24 ore per evento) si
  consuma DOPO i controlli sull'evento e sul proprietario. Ordine: 400 VALIDAZIONE → 404
  NON_TROVATO → 403 NON_PROPRIETARIO → 429 TROPPE_RICHIESTE → 409 EVENTO_CONCLUSO /
  EVENTO_ANNULLATO.
- Un tentativo del proprietario conta anche se poi l'evento risulta concluso o annullato.

### Motivazione

- La chiave del limite e' l'id dell'evento, non l'utente. Con il 429 prima del 403 (ordine generale
  della sezione 0 della progettazione) qualsiasi utente autenticato che conosce l'id di un evento
  potrebbe fare 5 richieste, ricevere 403, ed esaurire la quota del proprietario per 24 ore.
- Negli altri limiti (AI, iscrizioni, richieste di amicizia) la chiave e' l'id dell'utente: ognuno
  consuma solo la propria quota, e l'ordine generale resta valido.

### Alternative scartate

- **429 subito dopo la validazione, come nella sezione 0**: apre il blocco delle notifiche descritto
  sopra.
- **Chiave composta evento + utente**: inutile, solo il proprietario supera il 403; cambierebbe la
  chiave indicata in `docs/interfacce.md` senza vantaggi.

---

## Decisione 20: chatId in PartecipanteResponse

### Scelta

- `PartecipanteResponse` di ListaPartecipanti (BE1-17) ha anche `chatId`, oltre ai campi della
  sezione 7: `{ utente, proprietario, statoAmicizia, amiciziaId, chatId }`.
- Stessa regola di `RelazioneAmicizia` (decisione 15): valorizzato, se la chat esiste, solo quando
  lo e' `amiciziaId` (INVIATA, RICEVUTA, AMICI); con AMICI c'e' sempre. Con NESSUNA e
  NON_DISPONIBILE e' null.
- Chiude il punto aperto su `chatId` in `docs/interfacce.md`.

### Motivazione

- Il pulsante "Chat" della lista partecipanti (`PulsanteAmicizia`) apre `/chat/:chatId`: con il
  dato nella risposta non serve una seconda chiamata.
- Il dato e' gia' letto nella stessa query sulle amicizie (decisione 15, sezione 18): nessun costo
  in piu'.

### Alternative scartate

- **Testo letterale della sezione 7 (senza `chatId`)**: il frontend dovrebbe chiamare anche
  ListaAmici solo per trovare la chat.
