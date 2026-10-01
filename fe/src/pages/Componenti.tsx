import { useState, type ReactNode } from 'react'
import { useListaEventiQuery } from '@/features/eventi/apiEventi'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { useLoginMutation } from '@/features/utenti/apiUtenti'
import { selezionaUtente, uscita } from '@/store/sessioneSlice'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { CODICI_ERRORE, type CodiceErrore } from '@/lib/codiciErrore'
import { leggiErrore, type ErroreResponse } from '@/lib/errori'
import { DIMENSIONE_PAGINA, type PaginaResponse } from '@/lib/pagine'
import {
  IconaEvento,
  IconaPoi,
  Mappa,
  STILE_POI,
  STILE_STATO,
  type Coordinate,
  type MarkerMappa,
  type StileMappa,
} from '@/components/mappa'
import type { EventoMappaResponse, StatoEvento, TipoPoi } from '@/types/api'

// Marker della mappa di prova: gli eventi arrivano da GET /api/events (useListaEventiQuery),
// i tre POI sono quelli dell'evento al Colosseo.
function markerDiProva(
  eventiMappa: EventoMappaResponse[],
  mostra: (titolo: string, messaggio?: string) => void,
): MarkerMappa[] {
  return [
    ...eventiMappa.map(
      (e): MarkerMappa => ({
        id: e.id,
        tipo: 'evento',
        stato: e.stato,
        lat: e.lat,
        lng: e.lng,
        etichetta: e.titolo,
        onClick: () => mostra(e.titolo, `${STILE_STATO[e.stato].etichetta} · inizio ${new Date(e.dataEvento).toLocaleString('it-IT')}`),
      }),
    ),
    { id: 'poi-1', tipo: 'INGRESSO', lat: 41.8912, lng: 12.4902, etichetta: 'Ingresso nord' },
    { id: 'poi-2', tipo: 'USCITA', lat: 41.8893, lng: 12.4948, etichetta: 'Uscita est' },
    { id: 'poi-3', tipo: 'EMERGENZA', lat: 41.8889, lng: 12.4906, etichetta: 'Presidio medico' },
  ]
}


const statiEvento = Object.keys(STILE_STATO) as StatoEvento[]
const tipiPoiMappa = Object.keys(STILE_POI) as TipoPoi[]
import {
  Button,
  Caricamento,
  ConfirmDialog,
  DateTimeField,
  MessaggioErrore,
  Paginazione,
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

// Errori come li restituirebbe RTK Query, per provare i messaggi senza backend.
function erroreFinto(codice: string, status: number, campi: Record<string, string> = {}): FetchBaseQueryError {
  return {
    status,
    data: {
      status,
      codice,
      errore: 'Errore',
      messaggio: 'Testo tecnico del backend, non mostrato',
      campi,
      timestamp: new Date().toISOString(),
    } satisfies ErroreResponse,
  }
}

const erroriDiProva: { etichetta: string; errore: FetchBaseQueryError }[] = [
  { etichetta: 'EVENTO_CONCLUSO', errore: erroreFinto('EVENTO_CONCLUSO', 409) },
  { etichetta: 'GIA_ISCRITTO', errore: erroreFinto('GIA_ISCRITTO', 409) },
  { etichetta: 'CREDENZIALI_ERRATE', errore: erroreFinto('CREDENZIALI_ERRATE', 401) },
  { etichetta: 'NESSUN_TICKET', errore: erroreFinto('NESSUN_TICKET', 403) },
  { etichetta: 'TROPPE_RICHIESTE', errore: erroreFinto('TROPPE_RICHIESTE', 429) },
  { etichetta: 'SERVIZIO_ESTERNO', errore: erroreFinto('SERVIZIO_ESTERNO', 502) },
  { etichetta: 'Codice sconosciuto (409)', errore: erroreFinto('CODICE_NUOVO_NON_IN_CATALOGO', 409) },
  { etichetta: 'Rete', errore: { status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' } },
]

// PaginaResponse come la manderebbe GET /api/notifications/events?page=&size=20
function notificheFinte(pagina: number): PaginaResponse<string> {
  const totaleElementi = 387
  const inizio = pagina * DIMENSIONE_PAGINA
  return {
    contenuto: Array.from({ length: Math.min(DIMENSIONE_PAGINA, totaleElementi - inizio) }, (_, i) => `Notifica ${inizio + i + 1}`),
    pagina,
    dimensione: DIMENSIONE_PAGINA,
    totaleElementi,
    totalePagine: Math.ceil(totaleElementi / DIMENSIONE_PAGINA),
  }
}

const opzioniCodici:Opzione<CodiceErrore>[] = CODICI_ERRORE.map((c) => ({ valore: c, etichetta: c }))

const registrazioneRifiutata = erroreFinto('VALIDAZIONE', 400, {
  email: 'Deve essere un indirizzo email valido',
  password: 'La lunghezza deve essere compresa tra 8 e 72',
})

// Solo in sviluppo: entra con l'account di prova dei dati finti (mocks/datiSocial.ts) facendo un
// vero login (POST /api/auth/login), cosi' il token e' valido anche per il controllo del profilo
// all'avvio (ControlloSessione, FE2-02). Serve a provare le pagine protette senza registrarsi.
// Con il backend vero (VITE_DATI_FINTI=false) quell'account non esiste: si usa la pagina di login.
const ACCOUNT_DI_PROVA = { email: 'valentina@nosey.it', password: 'password123' }

function SessioneDiProva() {
  const dispatch = useAppDispatch()
  const utente = useAppSelector(selezionaUtente)
  const [login, { isLoading }] = useLoginMutation()
  const avviso = useAvviso()

  async function entra() {
    try {
      // Il login salva gia' la sessione (apiUtenti di FE2-03)
      await login(ACCOUNT_DI_PROVA).unwrap()
    } catch (e) {
      avviso.erroreApi(e)
    }
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl border border-dashed border-tertiary/50 p-space-md">
      <p className="font-body-md text-body-md text-on-surface-variant">
        <strong className="text-tertiary">Sessione di prova (dati finti):</strong>{' '}
        {utente ? `accesso come ${utente.nome} ${utente.cognome}` : 'nessun accesso'}
      </p>
      {utente ? (
        <Button size="sm" variant="secondary" icona="logout" onClick={() => dispatch(uscita())}>
          Esci
        </Button>
      ) : (
        <Button size="sm" variant="gold" icona="login" inCorso={isLoading} onClick={entra}>
          Accedi con l'utente finto
        </Button>
      )}
    </section>
  )
}

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
  const [erroreScelto, setErroreScelto] = useState<FetchBaseQueryError>(erroriDiProva[3].errore)
  const [erroreModulo, setErroreModulo] = useState<FetchBaseQueryError | null>(null)
  const [paginaEventi, setPaginaEventi] = useState(0)
  const [paginaNotifiche, setPaginaNotifiche] = useState(4)
  const [stileMappa, setStileMappa] = useState<StileMappa>('dark')
  const [puntoScelto, setPuntoScelto] = useState<Coordinate | null>(null)
  // Eventi da GET /api/events (FE1-03): in sviluppo rispondono i dati finti MSW
  const { data: eventiMappa = [], error: erroreEventi } = useListaEventiQuery()
  const avviso = useAvviso()
  const campiErrati = erroreModulo ? leggiErrore(erroreModulo).campi : {}

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

      {import.meta.env.DEV && <SessioneDiProva />}


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

      <Sezione titolo="Errori dal backend (ErroreResponse)">
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-wrap gap-space-xs">
            {erroriDiProva.map(({ etichetta, errore }) => (
              <Button
                key={etichetta}
                size="sm"
                variant={erroreScelto === errore ? 'primary' : 'secondary'}
                onClick={() => setErroreScelto(errore)}
              >
                {etichetta}
              </Button>
            ))}
          </div>
          <Select
            etichetta="Oppure scegli uno dei codici del backend"
            aiuto="Tutti i codici di CodiceErrore.java, con il testo che vedrà l'utente"
            segnaposto="Scegli un codice..."
            opzioni={opzioniCodici}
            defaultValue=""
            onChange={(e) => e.target.value && setErroreScelto(erroreFinto(e.target.value, 400))}
            className="max-w-md"
          />
          <MessaggioErrore errore={erroreScelto} onRiprova={() => avviso.info('Riprovo...')} />
          <div>
            <Button variant="secondary" icona="notifications" onClick={() => avviso.erroreApi(erroreScelto)}>
              Mostra come avviso
            </Button>
          </div>

          <form
            className="mt-space-sm grid gap-space-md rounded-xl bg-surface-container-low p-space-md md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              setErroreModulo(erroreModulo ? null : registrazioneRifiutata)
            }}
          >
            <p className="font-body-sm text-body-sm text-on-surface-variant md:col-span-2">
              Modulo di prova: "Invia" simula un errore VALIDAZIONE con errori sui campi (ErroreResponse.campi).
            </p>
            {erroreModulo && <MessaggioErrore errore={erroreModulo} className="md:col-span-2" />}
            <TextField etichetta="Email" name="email" defaultValue="mario@" errore={campiErrati.email} />
            <TextField etichetta="Password" name="password" type="password" defaultValue="1234" errore={campiErrati.password} />
            <div className="md:col-span-2">
              <Button type="submit">{erroreModulo ? 'Pulisci errori' : 'Invia'}</Button>
            </div>
          </form>
        </div>
      </Sezione>

      <Sezione titolo="Mappa (FE1-02)">
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center gap-space-xs">
            {(['dark', 'fiord'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={stileMappa === s ? 'primary' : 'secondary'}
                onClick={() => setStileMappa(s)}
              >
                Stile {s}
              </Button>
            ))}
            {puntoScelto && (
              <Button size="sm" variant="ghost" icona="close" onClick={() => setPuntoScelto(null)}>
                Togli il punto scelto
              </Button>
            )}
          </div>
          {erroreEventi ? (
            <MessaggioErrore errore={erroreEventi} />
          ) : (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {eventiMappa.length} eventi da GET /api/events (in sviluppo: dati finti MSW): clicca un marker per i dettagli.
            </p>
          )}
          <Mappa
            key={stileMappa}
            etichetta="Mappa di prova: eventi finti a Roma"
            centro={{ lat: 41.8902, lng: 12.4922 }}
            zoom={12}
            stile={stileMappa}
            marker={markerDiProva(eventiMappa, avviso.info)}
            puntoScelto={puntoScelto}
            onScegliPunto={setPuntoScelto}
            className="h-[420px]"
          />
          <ul aria-label="Legenda" className="flex flex-wrap gap-x-space-lg gap-y-space-sm">
            {statiEvento.map((s) => (
              <li key={s} className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <IconaEvento stato={s} /> Evento {STILE_STATO[s].etichetta.toLowerCase()}
              </li>
            ))}
            {tipiPoiMappa.map((t) => (
              <li key={t} className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <IconaPoi tipo={t} /> {STILE_POI[t].etichetta}
              </li>
            ))}
          </ul>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Clicca sulla mappa per scegliere un punto, poi trascina il segnaposto per spostarlo.{' '}
            {puntoScelto ? (
              <span className="font-mono text-on-surface">
                Punto scelto: {puntoScelto.lat}, {puntoScelto.lng}
              </span>
            ) : (
              'Nessun punto scelto.'
            )}
          </p>
        </div>
      </Sezione>

      <Sezione titolo="Paginazione">
        <div className="flex flex-col gap-space-md">
          <Paginazione
            pagina={paginaEventi}
            totalePagine={3}
            totaleElementi={14}
            dimensione={6}
            nomeElementi="eventi"
            onCambia={setPaginaEventi}
          />
          {/* Come con RTK Query: la PaginaResponse passata cosi' com'e' */}
          <Paginazione {...notificheFinte(paginaNotifiche)} nomeElementi="notifiche" onCambia={setPaginaNotifiche} />
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
