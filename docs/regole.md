# NoseY - Regole di lavoro (TEAM-01)

Regole comuni per board, branch e pull request. Valgono per tutte le card nuove.

## Branch

- `main` e' protetto: si unisce solo con una pull request approvata da un collega.
- Un branch per card, creato da `main` aggiornato, con l'ID della card nel nome:

  ```
  feature/<ID-CARD>-<descrizione-breve>
  ```

  esempi: `feature/BE1-01-flyway`, `feature/FE2-01-router`, `feature/TEAM-01-regole`
- Prima di aprire la pull request si porta dentro `main` (`git fetch` + `git merge origin/main`)
  e si risolvono qui gli eventuali conflitti, non nell'editor di GitHub.
- Dopo il merge il branch della card si puo' cancellare.

## Pull request

- **L'ID della card nel titolo**: `FE1-03 · Tipi TypeScript e dati finti del lato eventi`.
- Descrizione breve: cosa contiene, come provarlo, cosa resta fuori.
- Una card puo' avere piu' pull request (es. passi fatti a meta' in attesa di un'altra card):
  lo si scrive nel titolo, es. `(passi 1-4)`.

## Quando una card e' «Fatto»

- **Solo dopo il merge** in `main`: finita sul proprio branch o con la pull request aperta
  non basta.
- **Card del frontend: solo se funzionano con l'API vera**, non soltanto con i dati finti.
  Per verificarlo: backend avviato (`./avvia.sh`), `VITE_DATI_FINTI=false` in `fe/.env.local`,
  poi si prova la pagina.
- Card bloccate da un'altra card: restano aperte, con un commento su cosa manca.

## Documenti

- Progettazione: `docs/NoseY-progettazione.md` (versione unica, la v4).
- Decisioni tecniche: `docs/decisioni.md`, una sezione numerata per decisione.
- Interfacce condivise: `docs/interfacce.md`. Verbali: `docs/verbali.md`. Ruoli: `docs/ruoli.md`.
