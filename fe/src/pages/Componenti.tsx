import { useState, type ReactNode } from 'react'
import {
  Button,
  Caricamento,
  ConfirmDialog,
  DateTimeField,
  Scheletro,
  Select,
  StatoVuoto,
  TextArea,
  TextField,
  useAvviso,
  type Opzione,
} from '@/components/ui'

// Catalogo dei componenti comuni (FE1-01): serve per vederli tutti insieme mentre
// li sviluppiamo e come riferimento per chi li usa nelle pagine.

const tipiPoi: Opzione<'INGRESSO' | 'USCITA' | 'EMERGENZA'>[] = [
  { valore: 'INGRESSO', etichetta: 'Ingresso' },
  { valore: 'USCITA', etichetta: 'Uscita' },
  { valore: 'EMERGENZA', etichetta: 'Emergenza' },
]

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-surface-card p-space-lg">
      <h2 className="mb-space-md font-headline-sm text-headline-sm">{titolo}</h2>
      {children}
    </section>
  )
}

export default function Componenti() {
  const [messaggio, setMessaggio] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [conferma, setConferma] = useState<'annulla-evento' | 'iscrizione' | null>(null)
  const [confermaInCorso, setConfermaInCorso] = useState(false)
  const avviso = useAvviso()

  function simulaChiamata() {
    setInCorso(true)
    setTimeout(() => setInCorso(false), 1500)
  }

  function confermaAzione() {
    setConfermaInCorso(true)
    setTimeout(() => {
      setConfermaInCorso(false)
      setConferma(null)
      if (conferma === 'annulla-evento') avviso.info('Evento annullato', 'I partecipanti riceveranno una notifica.')
      else avviso.successo('Iscrizione completata', 'Trovi il ticket in I Miei Ticket.')
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <header>
        <p className="font-label-code-status text-label-code-status uppercase text-status-in-corso">
          FE1-01 · Componenti comuni
        </p>
        <h1 className="font-headline-lg text-headline-lg">Catalogo componenti</h1>
      </header>

      <Sezione titolo="Pulsanti">
        <div className="flex flex-wrap items-center gap-space-sm">
          <Button icona="confirmation_number">Iscriviti Subito</Button>
          <Button variant="gradient" iconaDopo="arrow_forward">Ticket Rapido</Button>
          <Button variant="secondary" icona="map">Dettagli & POI</Button>
          <Button variant="gold" icona="add_circle">Crea Evento</Button>
          <Button variant="ghost">Vedi Profilo</Button>
          <Button variant="danger" icona="event_busy">Annulla Iscrizione</Button>
        </div>
        <div className="mt-space-md flex flex-wrap items-center gap-space-sm">
          <Button size="sm">Piccolo</Button>
          <Button size="md">Medio</Button>
          <Button size="lg">Grande</Button>
          <Button disabled>Disabilitato</Button>
          <Button inCorso={inCorso} onClick={simulaChiamata}>
            {inCorso ? 'Invio...' : 'Prova caricamento'}
          </Button>
        </div>
      </Sezione>

      <Sezione titolo="Campi di testo">
        <div className="grid gap-space-md md:grid-cols-2">
          <TextField icona="search" placeholder="Cerca artista, club o format" aria-label="Cerca" />
          <TextField etichetta="Email" type="email" obbligatorio placeholder="nome@esempio.it" />
          <TextField
            etichetta="Password"
            type="password"
            obbligatorio
            aiuto="Da 8 a 72 caratteri"
          />
          <TextField
            etichetta="Titolo"
            obbligatorio
            defaultValue=""
            errore="Il titolo è obbligatorio"
          />
          <TextArea
            className="md:col-span-2"
            etichetta="Messaggio"
            placeholder="Scrivi un messaggio..."
            maxLength={2000}
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
          />
        </div>
      </Sezione>

      <Sezione titolo="Select, data e ora">
        <div className="grid gap-space-md md:grid-cols-3">
          <Select etichetta="Tipo di POI" obbligatorio segnaposto="Scegli un tipo..." opzioni={tipiPoi} defaultValue="" />
          <DateTimeField etichetta="Inizio evento" obbligatorio min={new Date()} />
          <DateTimeField etichetta="Data di nascita" soloData max={new Date()} />
        </div>
      </Sezione>

      <Sezione titolo="Finestra di conferma">
        <div className="flex flex-wrap gap-space-sm">
          <Button icona="confirmation_number" onClick={() => setConferma('iscrizione')}>
            Iscriviti all'evento
          </Button>
          <Button variant="danger" icona="event_busy" onClick={() => setConferma('annulla-evento')}>
            Annulla evento
          </Button>
        </div>
        <ConfirmDialog
          aperta={conferma === 'iscrizione'}
          titolo="Confermi l'iscrizione?"
          icona="confirmation_number"
          testoConferma="Iscriviti"
          inCorso={confermaInCorso}
          onConferma={confermaAzione}
          onAnnulla={() => setConferma(null)}
        >
          Riceverai il ticket via email e lo troverai in I Miei Ticket.
        </ConfirmDialog>
        <ConfirmDialog
          aperta={conferma === 'annulla-evento'}
          titolo="Annullare l'evento?"
          icona="warning"
          variante="danger"
          testoConferma="Annulla evento"
          testoAnnulla="Indietro"
          inCorso={confermaInCorso}
          onConferma={confermaAzione}
          onAnnulla={() => setConferma(null)}
        >
          L'operazione è irreversibile: l'evento sparisce dalla mappa e tutti i partecipanti
          ricevono una notifica.
        </ConfirmDialog>
      </Sezione>

      <Sezione titolo="Avvisi a comparsa">
        <div className="flex flex-wrap gap-space-sm">
          <Button variant="secondary" onClick={() => avviso.successo('Richiesta inviata', 'Riceverai una notifica quando verrà accettata.')}>
            Successo
          </Button>
          <Button variant="secondary" onClick={() => avviso.errore('Evento concluso', "Non è più possibile iscriversi.")}>
            Errore
          </Button>
          <Button variant="secondary" onClick={() => avviso.info('Nuovo messaggio', 'Sofia ti ha scritto.')}>
            Info
          </Button>
          <Button variant="secondary" onClick={() => avviso.attenzione('Troppe richieste', 'Attendi 60 secondi prima di richiedere un nuovo codice.')}>
            Attenzione
          </Button>
        </div>
      </Sezione>

      <Sezione titolo="Caricamento">
        <div className="flex flex-col gap-space-md">
          <Caricamento />
          <Caricamento riquadro testo="Carico gli eventi vicini..." />
          <div className="grid gap-space-md sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col gap-space-sm">
                <Scheletro className="h-40 w-full" />
                <Scheletro className="h-5 w-3/4" />
                <Scheletro className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </Sezione>

      <Sezione titolo="Stato vuoto">
        <div className="grid gap-space-md md:grid-cols-2">
          <StatoVuoto
            titolo="Nessun artista trovato"
            messaggio="Non ci sono artisti corrispondenti alla ricerca. Controlla l'ortografia o prova un altro nome."
            azione={<Button variant="secondary">Reimposta ricerca</Button>}
          />
          <StatoVuoto
            icona="confirmation_number"
            titolo="Nessun ticket"
            messaggio="Quando ti iscrivi a un evento, il ticket compare qui."
            azione={<Button icona="explore">Esplora eventi</Button>}
          />
        </div>
      </Sezione>
    </div>
  )
}
