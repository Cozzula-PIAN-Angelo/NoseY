import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/components/ui'

// Cookie Policy (card "Cookie Policy", passo 1), rotta /cookies (pubblica). Solo quello che il sito fa
// davvero: nessun cookie proprio, solo la sessione in localStorage (store/sessioneSlice.ts, tecnica e
// necessaria: niente consenso, quindi niente banner) e i servizi esterni che il browser contatta
// (Google Fonts in index.html, OpenFreeMap in components/mappa/tipi.ts, l'hosting Render).
// Se cambia uno di questi (es. statistiche, un nuovo servizio esterno), va aggiornata anche questa pagina.

/** Data dell'ultima modifica del testo, da cambiare a ogni aggiornamento */
const AGGIORNATA_IL = '2 ottobre 2026'

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-space-sm">
      <h2 className="font-headline-sm text-headline-sm text-on-surface">{titolo}</h2>
      {children}
    </section>
  )
}

function Paragrafo({ children }: { children: ReactNode }) {
  return <p className="font-body-md text-body-md text-on-surface-variant">{children}</p>
}

/** Una voce delle tabelle: nome, a cosa serve, durata o dati coinvolti */
function Voce({ nome, scopo, dettaglio }: { nome: ReactNode; scopo: string; dettaglio: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-space-md">
      <span className="font-label-btn text-label-btn text-on-surface">{nome}</span>
      <span className="font-body-sm text-body-sm text-on-surface-variant">{scopo}</span>
      <span className="font-label-code-status text-label-code-status uppercase text-outline">{dettaglio}</span>
    </li>
  )
}

export default function CookiePolicy() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-xs">
        <p className="font-label-code-status text-label-code-status uppercase tracking-wider text-secondary">Informativa</p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Cookie Policy</h1>
        <p className="font-body-sm text-body-sm text-outline">Ultimo aggiornamento: {AGGIORNATA_IL}</p>
      </header>

      <p className="flex items-start gap-space-sm rounded-xl bg-surface-card p-space-md font-body-md text-body-md text-on-surface">
        <Icon nome="cookie" size={24} className="mt-0.5 shrink-0 text-tertiary" />
        In breve: NoseY non usa cookie, né per statistiche né per pubblicità. Salva nel tuo browser solo quello che serve per tenerti dentro
        dopo l’accesso. Per questo non ti chiediamo il consenso e non vedi nessun banner.
      </p>

      <Sezione titolo="Cookie e tecnologie simili">
        <Paragrafo>
          I cookie sono piccoli file che un sito salva nel browser. Funzionano in modo simile il localStorage e gli altri spazi di memoria
          del browser: anche questi rientrano in questa informativa.
        </Paragrafo>
        <Paragrafo>
          Si dividono in tecnici, che servono a far funzionare il sito, e di profilazione o statistica, che servono a seguire chi visita il
          sito. Per legge solo i secondi richiedono il consenso; i tecnici vanno solo spiegati.
        </Paragrafo>
      </Sezione>

      <Sezione titolo="Cosa salva NoseY nel tuo browser">
        <ul className="flex flex-col gap-space-sm">
          <Voce
            nome={<code>nosey.sessione</code>}
            scopo="Dopo l’accesso salva il codice della sessione, quando scade e i dati del tuo profilo (nome, cognome, email, ruolo, immagine), così resti dentro anche ricaricando la pagina o aprendo un’altra scheda."
            dettaglio="Localstorage · tecnico · fino a quando esci o la sessione scade (24 ore)"
          />
        </ul>
        <Paragrafo>
          Non salviamo altro: la registrazione in corso resta solo nella pagina aperta, e la posizione non viene mai salvata nel browser.
        </Paragrafo>
      </Sezione>

      <Sezione titolo="Servizi esterni">
        <Paragrafo>
          Per mostrarti le pagine, il browser scarica alcuni contenuti da altri fornitori. Questi non salvano cookie per conto di NoseY, ma
          ricevono i dati tecnici di ogni connessione, come l’indirizzo IP e il tipo di browser.
        </Paragrafo>
        <ul className="flex flex-col gap-space-sm">
          <Voce nome="Google Fonts" scopo="Caratteri del sito e icone." dettaglio="Google · indirizzo IP e browser" />
          <Voce
            nome="OpenFreeMap"
            scopo="Le mappe degli eventi e dei punti di interesse."
            dettaglio="OpenFreeMap · indirizzo IP e browser"
          />
          <Voce nome="Render" scopo="Ospita il sito e il server di NoseY." dettaglio="Render · indirizzo IP e dati di connessione" />
        </ul>
        <Paragrafo>Come trattano questi dati lo spiegano le informative sulla privacy dei singoli fornitori.</Paragrafo>
      </Sezione>

      <Sezione titolo="Come cancellare i dati">
        <Paragrafo>
          Usa <strong className="text-on-surface">Esci</strong> dal menu del profilo: la sessione viene cancellata subito dal browser. Puoi
          anche cancellare i dati del sito dalle impostazioni del browser, alla voce cookie e dati dei siti; in quel caso dovrai solo rifare
          l’accesso.
        </Paragrafo>
      </Sezione>

      <Sezione titolo="Modifiche">
        <Paragrafo>
          Se NoseY comincerà a usare altri cookie, per esempio per le statistiche, aggiorneremo questa pagina e, quando la legge lo
          richiede, ti chiederemo prima il consenso.
        </Paragrafo>
      </Sezione>

      <Link to="/" className="self-start font-label-sm text-label-sm text-secondary hover:underline">
        ← Torna alla home
      </Link>
    </div>
  )
}
