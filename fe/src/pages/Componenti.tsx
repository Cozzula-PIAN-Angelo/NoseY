import { useState, type ReactNode } from 'react'
import { Button, DateTimeField, Select, TextArea, TextField, type Opzione } from '@/components/ui'

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

  function simulaChiamata() {
    setInCorso(true)
    setTimeout(() => setInCorso(false), 1500)
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
            errore="Il titolo e' obbligatorio"
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
    </div>
  )
}
