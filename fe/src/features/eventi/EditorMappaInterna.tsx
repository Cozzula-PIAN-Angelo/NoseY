import { useState, type FormEvent } from 'react'
import { IconaPoi, Mappa, STILE_POI, type Coordinate, type MarkerMappa } from '@/components/mappa'
import { Button, Icon, Select, TextField, useAvviso, type Opzione } from '@/components/ui'
import { cx } from '@/lib/cx'
import { LIMITI_EVENTI, type EventoDettaglioResponse, type TipoPoi } from '@/types/api'
import { useCreaPoiMutation } from './apiEventi'

// Editor della mappa interna (FE1-10) nella modifica dell'evento: clic sulla mappa per
// scegliere il punto, poi tipo ed etichetta e «Aggiungi». I POI salvati compaiono nella
// pagina dell'evento (sezione "Come muoversi").

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
  const avviso = useAvviso()

  const marker: MarkerMappa[] = [
    { id: evento.id, tipo: 'evento', stato: evento.stato, lat: evento.lat, lng: evento.lng, etichetta: evento.titolo },
    ...evento.poi.map(
      (p): MarkerMappa => ({ id: p.id, tipo: p.tipo, lat: p.lat, lng: p.lng, etichetta: p.etichetta ?? undefined }),
    ),
  ]

  function annulla() {
    setPunto(null)
    setEtichetta('')
  }

  async function aggiungi(e: FormEvent) {
    e.preventDefault()
    if (!punto) return
    try {
      await crea({ id: evento.id, dati: { tipo, lat: punto.lat, lng: punto.lng, etichetta: etichetta.trim() || undefined } }).unwrap()
      avviso.successo(`${STILE_POI[tipo].etichetta} aggiunto`, 'I partecipanti riceveranno una notifica sulla mappa interna.')
      annulla()
    } catch (err) {
      avviso.erroreApi(err)
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Clicca sulla mappa nel punto di un ingresso, di un'uscita o di un punto di emergenza.
      </p>

      <Mappa
        etichetta={`Mappa interna di ${evento.titolo}: clicca per aggiungere un punto`}
        centro={{ lat: evento.lat, lng: evento.lng }}
        zoom={16}
        marker={marker}
        puntoScelto={punto}
        onScegliPunto={setPunto}
        className="h-96"
      />

      {punto && (
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
            <Button type="submit" icona="add_location_alt" inCorso={isLoading}>
              Aggiungi
            </Button>
            <Button variant="ghost" onClick={annulla} disabled={isLoading}>
              Annulla
            </Button>
          </div>
        </form>
      )}

      {evento.poi.length === 0 ? (
        <p className="font-body-md text-body-md text-outline">Ancora nessun punto: aggiungine uno cliccando sulla mappa.</p>
      ) : (
        <ul aria-label="Punti della mappa interna" className="grid gap-space-sm sm:grid-cols-2 xl:grid-cols-3">
          {evento.poi.map((p) => (
            <li key={p.id} className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
              <IconaPoi tipo={p.tipo} />
              <div className="flex min-w-0 flex-col">
                <span className={cx('font-label-code-status text-label-code-status uppercase', STILE_POI[p.tipo].testo)}>
                  {STILE_POI[p.tipo].etichetta}
                </span>
                <span className={cx('truncate font-label-btn text-label-btn', p.etichetta ? 'text-on-surface' : 'text-outline')}>
                  {p.etichetta ?? 'Senza etichetta'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1 font-body-sm text-body-sm text-outline">
        <Icon nome="info" size={16} />
        Al massimo {LIMITI_EVENTI.poiPerEvento} punti, entro {LIMITI_EVENTI.raggioPoiKm} km dall'evento.
      </p>
    </div>
  )
}
