import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button, Icon, TextField } from '@/components/ui'
import { cx } from '@/lib/cx'
import { BadgeStato, BarreUrgenza, EtichettaCategoria, oraDi } from './Distintivi'
import { messaggiVisibili, staScrivendo, statoAl } from './sequenza'
import { LIMITE_RISPOSTA, URGENZE, type MessaggioRagnatela, type Segnalazione } from './tipi'

type DettaglioProps = {
  s: Segnalazione
  ora: number
  onIndietro: () => void
  onRispondi: (testo: string) => void
}

function Messaggio({ m }: { m: MessaggioRagnatela }) {
  const suo = m.autore === 'SPIDERMAN'
  return (
    <li className={cx('flex flex-col gap-1', suo ? 'items-start pr-8' : 'items-end pl-8')}>
      <span className="flex items-center gap-2">
        {suo ? (
          <span className="rg-obliquo bg-(--rg-oro) px-2 py-0.5 text-(--rg-inchiostro)">
            <span className="rg-dritto rg-titolo gap-1 text-[10px] font-bold tracking-widest">
              <Icon nome="bolt" size={12} piena />
              Spider-Man
            </span>
          </span>
        ) : (
          <span className="rg-titolo text-[10px] font-bold tracking-widest text-(--rg-testo-tenue)">Tu</span>
        )}
        <span className="text-[11px] tabular-nums text-(--rg-testo-tenue)">{oraDi(m.quando)}</span>
      </span>
      <p
        className={cx(
          'max-w-full px-space-md py-space-sm font-body-md text-body-md break-words',
          suo
            ? 'border-l-2 border-(--rg-oro) bg-(--rg-oro)/10 text-white shadow-[0_0_20px_-6px_rgba(223,153,53,0.35)]'
            : 'border border-(--rg-bordo) bg-(--rg-rialzata) text-(--rg-testo)',
        )}
      >
        <span className="sr-only">{suo ? 'Spider-Man: ' : 'Tu: '}</span>
        {m.testo}
      </p>
    </li>
  )
}

// Dettaglio di una segnalazione: card bianca con i dati e conversazione con Spider-Man
// (messaggi suoi in oro con il badge, quelli dell'utente neutri). I nuovi messaggi si annunciano
// con aria-live.
export function DettaglioSegnalazione({ s, ora, onIndietro, onRispondi }: DettaglioProps) {
  const id = useId()
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState<string>()
  const fine = useRef<HTMLDivElement>(null)
  const messaggi = messaggiVisibili(s, ora)
  const scrive = staScrivendo(s, ora)
  const stato = statoAl(s, ora)

  // Un messaggio nuovo (o l'indicatore) porta in fondo alla conversazione
  useEffect(() => {
    fine.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [messaggi.length, scrive])

  function invia(e: FormEvent) {
    e.preventDefault()
    const pulito = testo.trim()
    if (!pulito) {
      setErrore('Scrivi qualcosa prima di inviare.')
      return
    }
    onRispondi(pulito)
    setTesto('')
    setErrore(undefined)
  }

  return (
    <div className="flex flex-col gap-space-md">
      <button
        type="button"
        onClick={onIndietro}
        className="rg-titolo flex w-fit cursor-pointer items-center gap-1 text-xs font-bold tracking-wider text-(--rg-testo-tenue) hover:text-white"
      >
        <Icon nome="arrow_back" size={16} />
        Le mie segnalazioni
      </button>

      <article className={cx('border-l-4 bg-(--rg-pannello) p-4 text-(--rg-inchiostro) shadow-[0_12px_30px_rgba(0,0,0,0.7)]', stato === 'APERTA' ? 'border-(--rg-rosso)' : stato === 'IN_ARRIVO' ? 'border-(--rg-oro)' : 'border-(--rg-verde)')}>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <BarreUrgenza urgenza={s.urgenza} />
            <EtichettaCategoria categoria={s.categoria} className="text-(--rg-oro-testo)" />
          </span>
          <BadgeStato stato={stato} />
        </div>
        <h3 className="rg-titolo text-xl leading-snug font-bold">
          {s.titolo}
        </h3>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">
          Inviata alle <span className="tabular-nums">{oraDi(s.creata)}</span> · urgenza {URGENZE[s.urgenza].etichetta.toLowerCase()}
        </p>
        {s.descrizione && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-(--rg-inchiostro-tenue)">{s.descrizione}</p>}
      </article>

      <section aria-labelledby={`${id}-conv`} className="flex flex-col gap-space-sm">
        <h4 id={`${id}-conv`} className="rg-titolo text-xs font-bold tracking-widest text-(--rg-oro)">
          Conversazione
        </h4>
        <ol aria-live="polite" aria-relevant="additions" className="flex flex-col gap-space-md">
          {messaggi.map((m) => (
            <Messaggio key={m.id} m={m} />
          ))}
        </ol>
        {messaggi.length === 0 && !scrive && (
          <p className="font-body-sm text-body-sm text-(--rg-testo-tenue)">Segnalazione inviata. Il senso di ragno si sta attivando…</p>
        )}
        <div role="status" className="min-h-6">
          {scrive && (
            <span className="flex items-center gap-2 font-body-sm text-body-sm text-(--rg-oro)">
              <span aria-hidden="true" className="flex gap-1">
                <span className="rg-puntino size-1.5 rounded-full bg-(--rg-oro)" />
                <span className="rg-puntino size-1.5 rounded-full bg-(--rg-oro)" />
                <span className="rg-puntino size-1.5 rounded-full bg-(--rg-oro)" />
              </span>
              Spider-Man sta scrivendo…
            </span>
          )}
        </div>
        <div ref={fine} />
      </section>

      <form noValidate onSubmit={invia} className="rg-campi flex items-end gap-space-sm">
        <TextField
          etichetta="Rispondi a Spider-Man"
          value={testo}
          maxLength={LIMITE_RISPOSTA}
          placeholder="Scrivi un messaggio…"
          errore={errore}
          className="flex-1"
          onChange={(e) => {
            setTesto(e.target.value)
            if (errore) setErrore(undefined)
          }}
        />
        <Button type="submit" aria-label="Invia la risposta" className={cx('rg-azione rounded-none! px-4! py-3!', errore && 'mb-6')}>
          <Icon nome="send" size={20} />
        </Button>
      </form>
    </div>
  )
}
