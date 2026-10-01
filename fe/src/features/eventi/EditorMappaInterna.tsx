import { useState, type FormEvent } from 'react'
import { IconaPoi, Mappa, STILE_POI, type Coordinate, type MarkerMappa } from '@/components/mappa'
import { Button, ConfirmDialog, Icon, Select, TextField, useAvviso, type Opzione } from '@/components/ui'
import { cx } from '@/lib/cx'
import { leggiErrore } from '@/lib/errori'
import { distanzaKm } from '@/lib/geo'
import { LIMITI_EVENTI, type EventoDettaglioResponse, type PoiResponse, type TipoPoi } from '@/types/api'
import { useCancellaPoiMutation, useCreaPoiMutation, useModificaPoiMutation } from './apiEventi'

// Editor della mappa interna (FE1-10) nella modifica dell'evento: clic sulla mappa per
// scegliere il punto, poi tipo ed etichetta e «Aggiungi»; i POI si spostano trascinandoli e
// si cancellano dall'elenco. I POI salvati compaiono nella pagina dell'evento ("Come muoversi").

const TIPI: Opzione<TipoPoi>[] = [
  { valore: 'INGRESSO', etichetta: 'Ingresso' },
  { valore: 'USCITA', etichetta: 'Uscita' },
  { valore: 'EMERGENZA', etichetta: 'Emergenza (presidio medico, punto di raccolta…)' },
]

export function EditorMappaInterna({ evento }: { evento: EventoDettaglioResponse }) {
  const [punto, setPunto] = useState<Coordinate | null>(null)
  const [tipo, setTipo] = useState<TipoPoi>('INGRESSO')
  const [etichetta, setEtichetta] = useState('')
  const [crea, { isLoading }] = useCreaPoiMutation()
  const [modificaPoi] = useModificaPoiMutation()
  const [cancellaPoi, { isLoading: cancellazioneInCorso }] = useCancellaPoiMutation()
  const [daCancellare, setDaCancellare] = useState<PoiResponse | null>(null)
  const avviso = useAvviso()

  const pieno = evento.poi.length >= LIMITI_EVENTI.poiPerEvento
  const centroEvento = { lat: evento.lat, lng: evento.lng }
  // Distanza del punto scelto: oltre i 2 km non si invia nemmeno (il backend direbbe POI_TROPPO_LONTANO)
  const kmPunto = punto ? distanzaKm(centroEvento, punto) : 0
  const troppoLontano = kmPunto > LIMITI_EVENTI.raggioPoiKm

  /** Errori del backend con un messaggio pensato per la mappa interna; gli altri generici */
  function mostraErrore(err: unknown, dopoTrascinamento = false) {
    const { codice } = leggiErrore(err)
    if (codice === 'POI_TROPPO_LONTANO') {
      avviso.attenzione(
        'Punto troppo lontano',
        `Deve stare entro ${LIMITI_EVENTI.raggioPoiKm} km dall'evento, dentro il cerchio.${dopoTrascinamento ? ' È tornato al suo posto.' : ''}`,
      )
    } else if (codice === 'LIMITE_POI') {
      avviso.attenzione(
        'Limite di punti raggiunto',
        `Un evento può avere al massimo ${LIMITI_EVENTI.poiPerEvento} punti: eliminane uno per aggiungerne un altro.`,
      )
    } else {
      avviso.erroreApi(err)
    }
  }

  /** Spostamento trascinando il marker: subito sulla mappa, annullato se il backend rifiuta (apiEventi) */
  async function sposta(poi: PoiResponse, punto: Coordinate) {
    try {
      await modificaPoi({ id: evento.id, poiId: poi.id, dati: punto }).unwrap()
    } catch (err) {
      mostraErrore(err, true)
    }
  }

  async function confermaCancellazione() {
    if (!daCancellare) return
    try {
      await cancellaPoi({ id: evento.id, poiId: daCancellare.id }).unwrap()
      avviso.info(`${STILE_POI[daCancellare.tipo].etichetta} eliminato`)
    } catch (err) {
      avviso.erroreApi(err)
    }
    setDaCancellare(null)
  }

  const marker: MarkerMappa[] = [
    { id: evento.id, tipo: 'evento', stato: evento.stato, lat: evento.lat, lng: evento.lng, etichetta: evento.titolo },
    ...evento.poi.map(
      (p): MarkerMappa => ({
        id: p.id,
        tipo: p.tipo,
        lat: p.lat,
        lng: p.lng,
        etichetta: p.etichetta ?? undefined,
        onSposta: (punto) => sposta(p, punto),
      }),
    ),
  ]

  function annulla() {
    setPunto(null)
    setEtichetta('')
  }

  async function aggiungi(e: FormEvent) {
    e.preventDefault()
    if (!punto || troppoLontano || pieno) return
    try {
      await crea({ id: evento.id, dati: { tipo, lat: punto.lat, lng: punto.lng, etichetta: etichetta.trim() || undefined } }).unwrap()
      avviso.successo(`${STILE_POI[tipo].etichetta} aggiunto`, 'I partecipanti riceveranno una notifica sulla mappa interna.')
      annulla()
    } catch (err) {
      mostraErrore(err)
      // Con LIMITE_POI la lista si aggiorna da sola (POI aggiunti altrove): si toglie il punto scelto
      if (leggiErrore(err).codice === 'LIMITE_POI') annulla()
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <p className="flex items-center justify-between font-label-code-status text-label-code-status uppercase text-outline">
        <span>Punti della mappa interna</span>
        <span className={pieno ? 'text-accent-gold-piercing' : 'text-secondary'}>
          {evento.poi.length} / {LIMITI_EVENTI.poiPerEvento}
        </span>
      </p>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Clicca sulla mappa nel punto di un ingresso, di un'uscita o di un punto di emergenza,
        dentro il cerchio di {LIMITI_EVENTI.raggioPoiKm} km attorno all'evento. Avvicinati con la rotellina per più precisione.
        Per spostare un punto già salvato trascinalo.
      </p>

      <Mappa
        etichetta={`Mappa interna di ${evento.titolo}: clicca per aggiungere un punto`}
        centro={{ lat: evento.lat, lng: evento.lng }}
        // Con il cerchio di 2 km intero sullo schermo si vede subito fin dove si puo' cliccare
        zoom={13}
        marker={marker}
        cerchio={{ centro: { lat: evento.lat, lng: evento.lng }, raggioKm: LIMITI_EVENTI.raggioPoiKm }}
        puntoScelto={punto}
        // A 15 punti il clic non aggiunge piu' nulla
        onScegliPunto={pieno ? undefined : setPunto}
        className="h-96"
      />

      {pieno && (
        <p className="flex items-start gap-space-xs rounded-lg bg-accent-gold-glow p-space-sm font-body-md text-body-md text-on-surface">
          <Icon nome="wrong_location" size={20} className="mt-0.5 text-accent-gold-piercing" />
          Hai raggiunto il massimo di {LIMITI_EVENTI.poiPerEvento} punti: eliminane uno per aggiungerne un altro.
          Puoi ancora spostare quelli che ci sono.
        </p>
      )}

      {punto && !pieno && (
        <form
          onSubmit={aggiungi}
          aria-label="Nuovo punto della mappa interna"
          className="grid gap-space-md rounded-xl bg-surface-container-low p-space-md sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <Select etichetta="Tipo" opzioni={TIPI} value={tipo} onChange={(e) => setTipo(e.target.value as TipoPoi)} />
          <TextField
            etichetta="Etichetta"
            maxLength={LIMITI_EVENTI.etichettaPoi}
            value={etichetta}
            onChange={(e) => setEtichetta(e.target.value)}
            placeholder="Es. Ingresso nord"
          />
          <div className="flex gap-space-xs">
            <Button type="submit" icona="add_location_alt" inCorso={isLoading} disabled={troppoLontano}>
              Aggiungi
            </Button>
            <Button variant="ghost" onClick={annulla} disabled={isLoading}>
              Annulla
            </Button>
          </div>
          {troppoLontano && (
            <p role="alert" className="flex items-center gap-1 font-body-sm text-body-sm text-status-annullato sm:col-span-3">
              <Icon nome="error" size={16} />
              Il punto è a {kmPunto.toLocaleString('it-IT', { maximumFractionDigits: 1 })} km dall'evento: deve stare entro{' '}
              {LIMITI_EVENTI.raggioPoiKm} km, dentro il cerchio. Clicca più vicino o trascina il segnaposto.
            </p>
          )}
        </form>
      )}

      {evento.poi.length === 0 ? (
        <p className="font-body-md text-body-md text-outline">Ancora nessun punto: aggiungine uno cliccando sulla mappa.</p>
      ) : (
        <ul aria-label="Punti della mappa interna" className="grid gap-space-sm sm:grid-cols-2 xl:grid-cols-3">
          {evento.poi.map((p) => (
            <li key={p.id} className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
              <IconaPoi tipo={p.tipo} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={cx('font-label-code-status text-label-code-status uppercase', STILE_POI[p.tipo].testo)}>
                  {STILE_POI[p.tipo].etichetta}
                </span>
                <span className={cx('truncate font-label-btn text-label-btn', p.etichetta ? 'text-on-surface' : 'text-outline')}>
                  {p.etichetta ?? 'Senza etichetta'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDaCancellare(p)}
                aria-label={`Elimina ${STILE_POI[p.tipo].etichetta.toLowerCase()}${p.etichetta ? ` «${p.etichetta}»` : ''}`}
                className="shrink-0 rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-status-annullato/10 hover:text-status-annullato focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
              >
                <Icon nome="delete" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        aperta={daCancellare !== null}
        titolo={`Eliminare ${daCancellare ? STILE_POI[daCancellare.tipo].etichetta.toLowerCase() : 'il punto'}?`}
        icona="wrong_location"
        variante="danger"
        testoConferma="Elimina"
        inCorso={cancellazioneInCorso}
        onConferma={confermaCancellazione}
        onAnnulla={() => setDaCancellare(null)}
      >
        {daCancellare?.etichetta ? `«${daCancellare.etichetta}» sparirà dalla mappa interna.` : 'Il punto sparirà dalla mappa interna.'} I
        partecipanti riceveranno una notifica.
      </ConfirmDialog>

      <p className="flex items-center gap-1 font-body-sm text-body-sm text-outline">
        <Icon nome="info" size={16} />
        Al massimo {LIMITI_EVENTI.poiPerEvento} punti, entro {LIMITI_EVENTI.raggioPoiKm} km dall'evento.
      </p>
    </div>
  )
}
