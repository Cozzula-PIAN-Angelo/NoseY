import { useId, useState, type FormEvent } from 'react'
import { Icon, Select, TextArea, TextField, type Opzione } from '@/components/ui'
import type { Coordinate } from '@/components/mappa'
import { cx } from '@/lib/cx'
import {
  CATEGORIE,
  LIMITE_DESCRIZIONE,
  LIMITE_TITOLO,
  URGENZE,
  type Categoria,
  type NuovaSegnalazione,
  type Urgenza,
} from './tipi'

type Errori = Partial<Record<'punto' | 'titolo' | 'categoria', string>>

const opzioniCategoria: Opzione<Categoria>[] = (Object.keys(CATEGORIE) as Categoria[]).map((c) => ({
  valore: c,
  etichetta: CATEGORIE[c].etichetta,
}))
const urgenze = Object.keys(URGENZE) as Urgenza[]

const eCategoria = (v: string): v is Categoria => Object.hasOwn(CATEGORIE, v)

type FormSegnalazioneProps = {
  /** Punto scelto cliccando la mappa (lo gestisce la pagina, che passa onScegliPunto alla mappa) */
  punto: Coordinate | null
  onInvia: (dati: NuovaSegnalazione) => void
}

// Form "Nuova segnalazione": il punto si sceglie sulla mappa, il resto qui. Campi di components/ui,
// con l'aspetto del design dato da ragnatela.css (.rg-campi).
export function FormSegnalazione({ punto, onInvia }: FormSegnalazioneProps) {
  const id = useId()
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [urgenza, setUrgenza] = useState<Urgenza>('MEDIA')
  const [errori, setErrori] = useState<Errori>({})

  // Il punto scelto dopo l'errore lo toglie subito, senza aspettare un altro invio
  const erroreP = punto ? undefined : errori.punto

  function invia(e: FormEvent) {
    e.preventDefault()
    const nuovi: Errori = {}
    if (!punto) nuovi.punto = 'Tocca la mappa per indicare dove serve aiuto.'
    if (!titolo.trim()) nuovi.titolo = 'Scrivi un titolo: Spider-Man deve sapere cosa succede.'
    if (!categoria) nuovi.categoria = 'Scegli una categoria.'
    setErrori(nuovi)

    if (!punto || !categoria || nuovi.titolo) {
      // Il focus va al primo problema, nell'ordine in cui compaiono nel form
      const primo = nuovi.punto ? `${id}-punto` : nuovi.titolo ? `${id}-titolo` : `${id}-categoria`
      document.getElementById(primo)?.focus()
      return
    }
    onInvia({ titolo: titolo.trim(), descrizione: descrizione.trim(), categoria, urgenza, punto })
  }

  return (
    <form noValidate onSubmit={invia} className="rg-campi flex flex-col gap-space-md">
      <div
        id={`${id}-punto`}
        tabIndex={-1}
        className={cx(
          'flex items-start gap-space-sm border px-space-md py-space-sm',
          erroreP ? 'border-(--rg-rosso) bg-(--rg-rosso)/10' : 'border-(--rg-bordo) bg-(--rg-card)',
        )}
      >
        <Icon nome={punto ? 'where_to_vote' : 'touch_app'} size={22} className={punto ? 'text-(--rg-verde)' : 'text-(--rg-oro)'} />
        <div className="flex min-w-0 flex-col">
          <span className="rg-titolo text-xs font-bold tracking-widest text-(--rg-oro)">Punto sulla mappa *</span>
          {punto ? (
            <span className="font-body-sm text-body-sm tabular-nums text-(--rg-testo)">
              {punto.lat.toFixed(5)}, {punto.lng.toFixed(5)} · tocca di nuovo la mappa per spostarlo
            </span>
          ) : erroreP ? (
            <span role="alert" className="font-body-sm text-body-sm font-semibold text-red-300">
              {erroreP}
            </span>
          ) : (
            <span className="font-body-sm text-body-sm text-(--rg-testo-tenue)">Tocca la mappa nel punto dove serve aiuto.</span>
          )}
        </div>
      </div>

      <TextField
        id={`${id}-titolo`}
        etichetta="Titolo"
        obbligatorio
        value={titolo}
        maxLength={LIMITE_TITOLO}
        contatore
        placeholder="Es. Gatto bloccato su un cornicione"
        errore={errori.titolo}
        onChange={(e) => {
          setTitolo(e.target.value)
          if (errori.titolo && e.target.value.trim()) setErrori((x) => ({ ...x, titolo: undefined }))
        }}
      />

      <TextArea
        etichetta="Descrizione"
        value={descrizione}
        maxLength={LIMITE_DESCRIZIONE}
        rows={3}
        placeholder="Cosa vedi? Ci sono persone coinvolte?"
        onChange={(e) => setDescrizione(e.target.value)}
      />

      <Select
        id={`${id}-categoria`}
        etichetta="Categoria"
        obbligatorio
        opzioni={opzioniCategoria}
        segnaposto="Scegli una categoria…"
        value={categoria}
        errore={errori.categoria}
        onChange={(e) => {
          const v = e.target.value
          setCategoria(eCategoria(v) ? v : '')
          if (eCategoria(v)) setErrori((x) => ({ ...x, categoria: undefined }))
        }}
      />

      {/* Urgenza come pillole: sono radio veri, quindi frecce e Tab funzionano da soli */}
      <fieldset className="flex flex-col gap-space-xs">
        <legend className="rg-titolo mb-space-xs text-xs font-bold tracking-[0.08em] text-(--rg-oro)">Urgenza</legend>
        <div className="flex flex-wrap gap-space-sm">
          {urgenze.map((u) => (
            <label key={u} className="cursor-pointer">
              <input
                type="radio"
                name={`${id}-urgenza`}
                value={u}
                checked={urgenza === u}
                onChange={() => setUrgenza(u)}
                className="peer sr-only"
              />
              <span
                className={cx(
                  'rg-obliquo inline-flex border px-space-md py-1.5 transition-colors',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white',
                  urgenza === u
                    ? cx('border-transparent', URGENZE[u].colore, u === 'BASSA' ? 'text-slate-900' : 'text-white')
                    : 'border-white/15 bg-(--rg-card) text-(--rg-testo-tenue) hover:bg-(--rg-rialzata) hover:text-white',
                )}
              >
                <span className="rg-dritto rg-titolo gap-1 text-xs font-bold tracking-wider">
                  {urgenza === u && <Icon nome="check" size={14} />}
                  {URGENZE[u].etichetta}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="rg-obliquo rg-azione mt-space-xs w-full cursor-pointer py-3.5">
        <span className="rg-dritto rg-titolo text-base font-bold tracking-widest">
          <Icon nome="e911_emergency" size={22} />
          Chiama Spider-Man
        </span>
      </button>

      <p className="font-body-sm text-body-sm text-(--rg-testo-tenue)">
        È un gioco: le segnalazioni restano solo su questo dispositivo e non arrivano a nessuno. Per
        un&apos;emergenza vera chiama il <strong className="text-white">112</strong>.
      </p>
    </form>
  )
}
