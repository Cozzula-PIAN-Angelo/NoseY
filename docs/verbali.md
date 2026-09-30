# NoseY - Verbali delle riunioni

Un verbale per riunione, dal piu' recente al meno recente.

## AAAA-MM-GG - <argomento>

### Presenti

### Punti discussi

### Decisioni

### Prossimi passi

## 2026-09-30 - Componenti comuni del frontend (FE1-01)

### Presenti

<!-- DA COMPLETARE -->

### Punti discussi

- Libreria di componenti (Headless UI, shadcn/ui, Mantine) oppure componenti scritti da noi
  con Tailwind.
- Grafica di riferimento: il progetto Stitch "NoseY Event Management Platform", i cui token
  (colori, font, spaziature) sono gia' in `fe/src/index.css`.

### Decisioni

- Solo Tailwind, niente librerie di componenti: dettagli e motivazioni nella
  Decisione 2 di `docs/decisioni.md`.
- I componenti comuni stanno in `fe/src/components/ui/` e li usano tutti e due i frontend.

### Prossimi passi

- FE1-01: pulsante, campi, select, data e ora; finestra di conferma, avviso a comparsa,
  caricamento, stato vuoto; messaggio d'errore da `ErroreResponse`; paginazione.
