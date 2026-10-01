import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link } from 'react-router'
import { BadgeStato } from '@/components/eventi'
import { Icon, stilePulsante } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import { intervallo } from '@/lib/formato'
import type { EventoMappaResponse } from '@/types/api'

// Carosello degli eventi in programma e in corso (FE1-19, passo 4), il "Cylindrical 3D Carousel" di
// Stitch fatto con le trasformazioni CSS, senza librerie: le card stanno su un cilindro e quella davanti
// e' l'evento attivo. Si gira con le frecce, i puntini, i tasti ← → e trascinando (dito o mouse).
// Con prefers-reduced-motion niente 3D ne' animazioni: una card alla volta.

/** Larghezza di una card in px: serve per il raggio del cilindro e per il trascinamento */
const LARGHEZZA = 240
/** Al massimo tante card sul cilindro (oltre diventano troppo strette ai lati) */
const MASSIMO = 8

function useMenoMovimento() {
  const [ridotto, setRidotto] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const cambia = () => setRidotto(mq.matches)
    mq.addEventListener('change', cambia)
    return () => mq.removeEventListener('change', cambia)
  }, [])
  return ridotto
}

function CardCarosello({ evento, attiva }: { evento: EventoMappaResponse; attiva: boolean }) {
  const copertina = urlImmagine(evento.copertinaUrl)
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface-card shadow-2xl ring-1 ring-outline-variant/30">
      <div className="relative aspect-square bg-surface-container">
        {copertina ? (
          // Decorativa: il titolo e' subito sotto
          <img src={copertina} alt="" draggable={false} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-inverse-primary/40 to-surface-deep">
            <Icon nome="nightlife" size={48} className="text-primary/70" />
          </div>
        )}
        <BadgeStato stato={evento.stato} className="absolute left-space-sm top-space-sm bg-surface-deep/80 backdrop-blur-md" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-space-md">
        <h3 className="line-clamp-2 font-headline-sm text-headline-sm">{evento.titolo}</h3>
        <p className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
          <Icon nome="event" size={16} />
          {intervallo(evento.dataEvento, evento.dataFine)}
        </p>
        {attiva && (
          <Link to={`/events/${evento.id}`} className={cx(stilePulsante({ size: 'sm', pieno: true }), 'mt-space-xs')}>
            <Icon nome="visibility" size={16} />
            Vedi evento
          </Link>
        )}
      </div>
    </article>
  )
}

export function CaroselloEventi({ eventi: tutti }: { eventi: EventoMappaResponse[] }) {
  const eventi = tutti.slice(0, MASSIMO)
  const n = eventi.length
  const [attivo, setAttivo] = useState(0)
  // Rotazione in piu' mentre si trascina (gradi), 0 a riposo
  const [trascinamento, setTrascinamento] = useState(0)
  const inizio = useRef<{ x: number; id: number } | null>(null)
  const menoMovimento = useMenoMovimento()

  if (n === 0) return null
  const indice = ((attivo % n) + n) % n
  const passo = 360 / n
  // Raggio perche' le card si tocchino appena sul cilindro (con 1 o 2 card non serve)
  const raggio = n > 2 ? Math.round(LARGHEZZA / 2 / Math.tan(Math.PI / n)) + 24 : 0
  const usa3d = !menoMovimento && n > 2

  const vai = (delta: number) => setAttivo((a) => a + delta)

  function tasto(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      vai(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      vai(-1)
    }
  }

  function giu(e: PointerEvent<HTMLDivElement>) {
    // Il trascinamento non parte dal pulsante "Vedi evento"
    if ((e.target as HTMLElement).closest('a, button')) return
    inizio.current = { x: e.clientX, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function muovi(e: PointerEvent<HTMLDivElement>) {
    if (!inizio.current || inizio.current.id !== e.pointerId) return
    setTrascinamento(((e.clientX - inizio.current.x) / LARGHEZZA) * passo)
  }

  function su(e: PointerEvent<HTMLDivElement>) {
    if (!inizio.current || inizio.current.id !== e.pointerId) return
    const dx = e.clientX - inizio.current.x
    inizio.current = null
    setTrascinamento(0)
    // Si aggancia alla card piu' vicina; trascinare a destra porta la card di sinistra davanti
    const scatti = Math.round(dx / LARGHEZZA)
    if (scatti !== 0) vai(-scatti)
  }

  return (
    <section
      aria-roledescription="carosello"
      aria-label="Eventi in programma e in corso"
      tabIndex={0}
      onKeyDown={tasto}
      className="flex flex-col items-center gap-space-md rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
    >
      <div
        className={cx('relative h-[26rem] w-full touch-pan-y select-none overflow-hidden', usa3d && 'cursor-grab active:cursor-grabbing')}
        style={usa3d ? { perspective: '1100px' } : undefined}
        onPointerDown={usa3d ? giu : undefined}
        onPointerMove={usa3d ? muovi : undefined}
        onPointerUp={usa3d ? su : undefined}
        onPointerCancel={usa3d ? su : undefined}
      >
        {usa3d ? (
          <div
            className={cx('absolute left-1/2 top-0 h-full', trascinamento === 0 && 'transition-transform duration-500 ease-out')}
            style={{
              width: LARGHEZZA,
              marginLeft: -LARGHEZZA / 2,
              transformStyle: 'preserve-3d',
              transform: `translateZ(${-raggio}px) rotateY(${-attivo * passo + trascinamento}deg)`,
            }}
          >
            {eventi.map((e, i) => {
              // Distanza (in passi) dalla card davanti: decide trasparenza e cosa si puo' cliccare
              const distanza = Math.min((i - indice + n) % n, (indice - i + n) % n)
              const davanti = i === indice
              return (
                <div
                  key={e.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} di ${n}: ${e.titolo}`}
                  aria-hidden={!davanti}
                  inert={!davanti}
                  className="absolute inset-x-0 top-0 transition-opacity duration-500 [backface-visibility:hidden]"
                  style={{
                    transform: `rotateY(${i * passo}deg) translateZ(${raggio}px)`,
                    opacity: davanti ? 1 : Math.max(0.15, 0.7 - distanza * 0.2),
                  }}
                >
                  <CardCarosello evento={e} attiva={davanti} />
                </div>
              )
            })}
          </div>
        ) : (
          // Meno movimento (o 1-2 eventi): una card alla volta, senza animazioni
          <div role="group" aria-roledescription="slide" aria-label={`${indice + 1} di ${n}: ${eventi[indice].titolo}`} className="mx-auto h-full" style={{ width: LARGHEZZA }}>
            <CardCarosello evento={eventi[indice]} attiva />
          </div>
        )}
      </div>

      {n > 1 && (
        <div className="flex items-center gap-space-md rounded-xl bg-surface-card px-space-sm py-space-xs">
          <button
            type="button"
            onClick={() => vai(-1)}
            aria-label="Evento precedente"
            className="rounded-lg bg-surface-container p-1.5 text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <Icon nome="arrow_back" size={20} />
          </button>
          <div className="flex items-center gap-1.5">
            {eventi.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setAttivo(attivo + ((i - indice + n) % n <= n / 2 ? (i - indice + n) % n : (i - indice + n) % n - n))}
                aria-label={`Vai all'evento ${i + 1}: ${e.titolo}`}
                aria-current={i === indice ? 'true' : undefined}
                className={cx(
                  'h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
                  i === indice ? 'w-6 bg-primary' : 'w-1.5 bg-outline-variant hover:bg-outline',
                )}
              />
            ))}
          </div>
          <span aria-live="polite" className="font-label-code-status text-label-code-status text-on-surface-variant">
            {indice + 1} / {n}
          </span>
          <button
            type="button"
            onClick={() => vai(1)}
            aria-label="Evento successivo"
            className="rounded-lg bg-surface-container p-1.5 text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <Icon nome="arrow_forward" size={20} />
          </button>
        </div>
      )}
    </section>
  )
}
