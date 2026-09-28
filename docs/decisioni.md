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
