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
