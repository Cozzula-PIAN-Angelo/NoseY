import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/components/ui'

// Privacy Policy (card dopo la Cookie Policy), rotta /privacy (pubblica). Come la Cookie Policy, dice
// solo quello che il sito fa davvero, letto dal codice: i dati dell'account (store/sessioneSlice.ts,
// types/utenti.ts), i contenuti creati dagli utenti, l'uso dell'email (verifica, reset, notifiche;
// invio con Brevo in produzione), l'AI di Google Gemini solo su richiesta (be ai/), la posizione mai
// salvata (features/eventi/usePosizioneUtente.ts) e i diritti dal profilo (modifica, password,
// eliminazione account tramite anonimizzazione, features/profilo/EliminaAccount.tsx).
// Titolare e contatto non sono noti: restano un segnaposto, da riempire prima di andare davvero online.
// Se cambiano i dati raccolti o i servizi esterni, va aggiornata anche questa pagina.

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

/** Una voce di elenco: nome del dato o del servizio, a cosa serve, dettaglio */
function Voce({ nome, scopo, dettaglio }: { nome: ReactNode; scopo: string; dettaglio: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-space-md">
      <span className="font-label-btn text-label-btn text-on-surface">{nome}</span>
      <span className="font-body-sm text-body-sm text-on-surface-variant">{scopo}</span>
      <span className="font-label-code-status text-label-code-status uppercase text-outline">{dettaglio}</span>
    </li>
  )
}

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-xs">
        <p className="font-label-code-status text-label-code-status uppercase tracking-wider text-secondary">Informativa</p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Privacy Policy</h1>
        <p className="font-body-sm text-body-sm text-outline">Ultimo aggiornamento: {AGGIORNATA_IL}</p>
      </header>

      <p className="flex items-start gap-space-sm rounded-xl bg-surface-card p-space-md font-body-md text-body-md text-on-surface">
        <Icon nome="shield_person" size={24} className="mt-0.5 shrink-0 text-tertiary" />
        In breve: NoseY raccoglie solo i dati che servono per farti usare l’app — il tuo account e quello che pubblichi (eventi, ticket,
        amicizie, messaggi). Non vendiamo i tuoi dati e non li usiamo per pubblicità. Puoi vederli, modificarli ed eliminare l’account
        quando vuoi.
      </p>

      <Sezione titolo="Chi tratta i tuoi dati">
        <Paragrafo>
          NoseY è un progetto didattico sviluppato dal team NoseY. Il titolare del trattamento e un indirizzo di contatto saranno indicati
          qui prima della pubblicazione definitiva del sito. Nel frattempo, per qualsiasi richiesta sui tuoi dati puoi rivolgerti al team di
          sviluppo.
        </Paragrafo>
      </Sezione>

      <Sezione titolo="Quali dati raccogliamo">
        <ul className="flex flex-col gap-space-sm">
          <Voce
            nome="Dati dell’account"
            scopo="Email, nome e cognome, e se li aggiungi indirizzo, data di nascita e immagine del profilo. La password è salvata solo come hash cifrato, mai in chiaro."
            dettaglio="Forniti da te alla registrazione e nel profilo"
          />
          <Voce
            nome="Contenuti che crei"
            scopo="Gli eventi che organizzi, le foto e i punti di interesse che carichi, le iscrizioni e i ticket, le richieste di amicizia e i messaggi di chat."
            dettaglio="Generati mentre usi l’app"
          />
          <Voce
            nome="Dati tecnici"
            scopo="Per tenerti collegato dopo l’accesso, il browser conserva il codice di sessione. Il server registra i dati tecnici delle richieste (es. indirizzo IP) per far funzionare e proteggere il servizio."
            dettaglio="Automatici · vedi anche la Cookie Policy"
          />
        </ul>
      </Sezione>

      <Sezione titolo="Perché usiamo i tuoi dati">
        <Paragrafo>
          Usiamo i dati solo per far funzionare NoseY: creare e gestire il tuo account, mostrarti gli eventi, farti iscrivere e darti i
          ticket, gestire amicizie e chat, e inviarti le comunicazioni legate agli eventi. Non li usiamo per profilazione o pubblicità e non
          li cediamo a terzi per i loro scopi.
        </Paragrafo>
      </Sezione>

      <Sezione titolo="La tua posizione">
        <Paragrafo>
          La posizione viene chiesta <strong className="text-on-surface">solo</strong> se premi “Usa la mia posizione” per ordinare gli
          eventi dal più vicino. Resta nella pagina aperta e <strong className="text-on-surface">non viene mai salvata</strong>, né sul
          server né nel browser. Se non dai il consenso, gli eventi restano ordinati per data.
        </Paragrafo>
      </Sezione>

      <Sezione titolo="Email">
        <Paragrafo>
          Usiamo la tua email per inviarti il codice di verifica, il codice per reimpostare la password e le notifiche degli eventi a cui
          sei iscritto. In produzione l’invio passa dal servizio Brevo.
        </Paragrafo>
      </Sezione>

      <Sezione titolo="Servizi esterni">
        <Paragrafo>
          Per funzionare, NoseY si appoggia ad alcuni fornitori esterni. Ricevono solo i dati necessari al servizio che svolgono, e non per
          conto nostro ad altri scopi.
        </Paragrafo>
        <ul className="flex flex-col gap-space-sm">
          <Voce nome="Render" scopo="Ospita il sito e il server di NoseY." dettaglio="Dati di connessione (es. indirizzo IP)" />
          <Voce nome="Brevo" scopo="Invia le email di verifica, reset password e notifiche." dettaglio="Email e contenuto del messaggio" />
          <Voce
            nome="Google Gemini"
            scopo="Solo se un organizzatore chiede di migliorare la descrizione di un evento con l’AI: il testo della descrizione viene inviato a Google."
            dettaglio="Solo su richiesta · testo dell’evento"
          />
          <Voce nome="Google Fonts" scopo="Caratteri e icone del sito." dettaglio="Indirizzo IP e browser" />
          <Voce nome="OpenFreeMap" scopo="Le mappe degli eventi e dei punti di interesse." dettaglio="Indirizzo IP e browser" />
        </ul>
        <Paragrafo>Come trattano i dati lo spiegano le informative sulla privacy dei singoli fornitori.</Paragrafo>
      </Sezione>

      <Sezione titolo="Per quanto tempo li teniamo">
        <Paragrafo>
          Teniamo i dati del tuo account finché l’account esiste. Quando lo elimini vengono cancellati o resi anonimi, come spiegato qui
          sotto. Il codice di sessione nel browser scade dopo 24 ore o quando esci.
        </Paragrafo>
      </Sezione>

      <Sezione titolo="I tuoi diritti">
        <Paragrafo>
          Dalla pagina <strong className="text-on-surface">Profilo</strong> puoi in ogni momento vedere e modificare i tuoi dati, cambiare
          la password ed eliminare l’account.
        </Paragrafo>
        <Paragrafo>
          Eliminando l’account, nome, email, indirizzo, data di nascita e immagine del profilo vengono cancellati; le iscrizioni agli eventi
          futuri vengono annullate, mentre i ticket degli eventi passati restano; i messaggi che hai scritto restano, ma firmati “Utente
          anonimo”. Per le richieste che non puoi gestire da solo puoi contattare il team.
        </Paragrafo>
      </Sezione>

      <Sezione titolo="Modifiche">
        <Paragrafo>Se cambieranno i dati che raccogliamo o i servizi che usiamo, aggiorneremo questa pagina e la data in alto.</Paragrafo>
      </Sezione>

      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Vedi anche la{' '}
        <Link to="/cookies" className="text-secondary hover:underline">
          Cookie Policy
        </Link>
        .
      </p>

      <Link to="/" className="self-start font-label-sm text-label-sm text-secondary hover:underline">
        ← Torna alla home
      </Link>
    </div>
  )
}
