# Ragnatela - design system "Cinematic Vigilante" (riassunto)

Dal progetto Stitch **Ragnatela** (ID `7217513115593259868`), design system visibile "Cinematic
Vigilante", usato da tutte e tre le schermate. Il progetto ha anche un secondo design system,
"Urban Civic Safety Network" (cremisi `#e11d48`, angoli arrotondati, "niente fumetto"): e' nascosto
e contraddice le schermate, quindi non si usa.

Nel codice i colori sono variabili CSS sotto `.modalita-ragnatela` in
`fe/src/features/ragnatela/ragnatela.css`, non token di `index.css`.

## Colori (palette `spider-*` della schermata Console)

| Ruolo | Valore | Variabile |
|---|---|---|
| Rosso scarlatto (azioni, APERTA, urgenza Alta) | `#E22328`, hover `#FF1F26`, scuro `#B71115` | `--rg-rosso`, `--rg-rosso-acceso`, `--rg-rosso-scuro` |
| Oro (occhielli, Spider-Man, IN ARRIVO) | `#DF9935`, tenue `#B27C39` | `--rg-oro`, `--rg-oro-tenue` |
| Oro per testo su bianco | `#8A5A1C` (aggiunto per il contrasto) | `--rg-oro-testo` |
| Blu (urgenza Media, anelli del radar) | `#1B56E0` | `--rg-blu` |
| Verde (RISOLTA) | `#10B981`, testo su bianco `#047857` | `--rg-verde`, `--rg-verde-scuro` |
| Sfondo e superfici | `#0B0D11`, `#12151B`, `#181C24`, `#212733` | `--rg-sfondo`, `--rg-superficie`, `--rg-card`, `--rg-rialzata` |
| Bordo | `#2D3442` | `--rg-bordo` |
| Testo su scuro | `#E3E2E6`, tenue `#9DA3AE` | `--rg-testo`, `--rg-testo-tenue` |
| Pannelli bianchi e testo su bianco | `#FFFFFF`, `#0B0D11`, tenue `#4B5563` | `--rg-pannello`, `--rg-inchiostro`, `--rg-inchiostro-tenue` |

## Tipografia

- Titoli, pulsanti, badge: **Oswald** maiuscolo (500-700), classe `.rg-titolo`.
- Testo: Plus Jakarta Sans (gia' caricato da NoseY).
- Occhielli: Plus Jakarta Sans o Oswald maiuscolo spaziato, in oro.

## Forme e componenti

- Angoli quasi vivi (2-4 px); niente pillole tonde.
- Pulsanti e badge obliqui: `skewX(-12deg)` sul contenitore, contenuto raddrizzato
  (`.rg-obliquo` + `.rg-dritto`). Azione principale rossa con alone (`.rg-azione`).
- Card bianche ad alto contrasto con bordo sinistro colorato dallo stato; occhiello della categoria
  in oro, urgenza a 3 barrette, titolo Oswald.
- Marker della mappa: rombi (quadrato ruotato di 45 gradi) colorati, con l'icona della categoria.
- Campi scuri (`#181C24`, bordo `#2D3442`) con focus rosso e alone.
- Sfondo a griglia di 40 px e radar (anelli, mirino, cono che ruota) sopra la mappa.
