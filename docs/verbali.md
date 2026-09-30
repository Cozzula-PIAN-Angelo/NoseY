# NoseY - Verbali delle riunioni

Un verbale per riunione, dal piu' recente al meno recente.

## AAAA-MM-GG - <argomento>

### Presenti

### Punti discussi

### Decisioni

### Prossimi passi

## 2026-09-30 - Libreria delle mappe (FE1-02)

### Punti discussi

- Libreria: Leaflet (con tessere raster OpenStreetMap) oppure MapLibre GL (tessere vettoriali).
- Fonte delle tessere e stile: la grafica Stitch e' scura, le tessere OSM standard sono chiare.

### Decisioni

- MapLibre GL con react-map-gl e tessere vettoriali di OpenFreeMap, stili `dark` e `fiord`:
  dettagli e motivazioni nella Decisione 6 di `docs/decisioni.md`.

### Prossimi passi

- FE1-02: componente Mappa (centro, zoom, marker, clic per scegliere un punto), attribuzione
  di OpenStreetMap, icone per evento, ingresso, uscita ed emergenza.

## 2026-09-30 - Componenti comuni del frontend (FE1-01)

### Punti discussi

- Libreria di componenti (Headless UI, shadcn/ui, Mantine) oppure componenti scritti da noi
  con Tailwind.
- Grafica di riferimento: il progetto Stitch "NoseY Event Management Platform", i cui token
  (colori, font, spaziature) sono gia' in `fe/src/index.css`.

### Decisioni

- Solo Tailwind, niente librerie di componenti: dettagli e motivazioni nella
  Decisione 5 di `docs/decisioni.md`.
- I componenti comuni stanno in `fe/src/components/ui/` e li usano tutti e due i frontend.

### Prossimi passi

- FE1-01: pulsante, campi, select, data e ora; finestra di conferma, avviso a comparsa,
  caricamento, stato vuoto; messaggio d'errore da `ErroreResponse`; paginazione.
