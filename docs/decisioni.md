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

## Decisione 3: solo Tailwind, senza librerie di componenti

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
