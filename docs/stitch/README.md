# Design di riferimento (Stitch)

Schermate scaricate dal progetto Stitch **NoseY Event Management Platform**
(ID `1633314175467266148`) con `curl -L` dagli URL ospitati da Stitch: l'immagine
(larghezza 1280 px) e il codice HTML generato. Servono come riferimento per le pagine
del frontend: non sono codice dell'app.

| File | Schermata Stitch | ID | Card |
|---|---|---|---|
| `registrazione-account.png` / `.html` | NoseY - Registrazione Account | `9ae5d9e2e94b477c8dcc0ec1ebc6aa15` | FE1-18, FE2-06 (barrette della nuova password), FE2-07 (profilo), FE2-08 (immagine del profilo) |
| `verifica-otp.png` / `.html` | NoseY - Verifica Codice OTP & Accesso Mappa | `75b52121f4614ca6aabad40da1748d65` | FE1-18, FE2-06 (password dimenticata) |
| `community-amicizie-chat.png` / `.html` | NoseY - Community, Amicizie & Chat Live STOMP | `5e110fa098de44cd8e5b740d88526bc5` | FE2-10 (amici e richieste, colonna "Social Radar"), FE2-12 (chat: elenco e conversazione), FE2-13 (notifiche: righe e colori del pannello "Notifiche Feed", pillola dello stato della connessione) |

Nelle pagine vere si tengono layout, colori e componenti; si lasciano fuori gli elementi
che servivano solo a provare il design (es. "Simulatore Responsi Backend", "Dev Simulation
Matrix") e le diciture tecniche non vere (es. "AES-256 GCM", "Session hash").

## Modalita' Ragnatela (easter egg, Decisione 25)

Progetto Stitch a parte: **Ragnatela** (ID `7217513115593259868`). Le schermate stanno in
`ragnatela/`; colori, font e componenti del design system "Cinematic Vigilante" sono riassunti in
`ragnatela/design-system.md`.

| File | Schermata Stitch | ID | Uso |
|---|---|---|---|
| `ragnatela/ragnatela-mobile.jpg` / `.html` | Ragnatela - Spider-Man Cinematic Style (mobile, 390 px) | `d1407971c50c45118948ee865ffcee9a` | layout mobile: barra in basso, card bianche, rombi sulla mappa |
| `ragnatela/ragnatela-desktop-console.png` / `.html` | Ragnatela - Desktop Console Operativa Marvel Style | `a4806e097f9a4212823cdf5b1f24d45d` | layout desktop: header, radar a sinistra, "Dispaccio operativo" a destra, palette `spider-*` |
| `ragnatela/ragnatela-desktop-radar.png` / `.html` | Ragnatela - Desktop Radar & Console Operativa | `08c6fe2d8bb040eeb1cfc98334911413` | solo archivio: versione precedente della Console, renderizzata senza stili |

La schermata mobile Stitch la esporta in JPEG, per questo l'estensione e' `.jpg`. Come per le altre
schermate, restano fuori gli elementi di prova: foto e nome di personaggi, statistiche finte,
"Pattuglia 01", ricerca, distanze e voci di menu che non esistono.
