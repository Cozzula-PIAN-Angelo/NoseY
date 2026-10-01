import { useState } from 'react'
import { Icon } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import type { FotoResponse } from '@/types/api'

type GalleriaFotoProps = {
  /** Come arrivano dal backend: prima la copertina, poi in ordine di caricamento */
  foto: FotoResponse[]
  /** Testo alternativo di riserva per le foto senza didascalia */
  titoloEvento: string
}

// Galleria della pagina dell'evento (FE1-05): foto grande e miniature cliccabili.
export function GalleriaFoto({ foto, titoloEvento }: GalleriaFotoProps) {
  const [indice, setIndice] = useState(0)
  const attuale = foto[Math.min(indice, foto.length - 1)]

  if (!attuale) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-2xl bg-gradient-to-br from-inverse-primary/40 to-surface-deep">
        <span className="flex flex-col items-center gap-space-xs text-on-surface-variant">
          <Icon nome="nightlife" size={48} className="text-primary/70" />
          <span className="font-body-sm text-body-sm">Nessuna foto per questo evento</span>
        </span>
      </div>
    )
  }

  const alt = (f: FotoResponse, n: number) => f.didascalia ?? `${titoloEvento}, foto ${n + 1}`

  return (
    <div className="flex flex-col gap-space-sm">
      <figure className="relative overflow-hidden rounded-2xl bg-surface-container">
        <img
          src={urlImmagine(attuale.url) ?? undefined}
          alt={alt(attuale, indice)}
          className="aspect-[16/9] w-full object-cover"
        />
        {attuale.didascalia && (
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-deep/90 to-transparent px-space-md pb-space-sm pt-space-xl font-body-sm text-body-sm text-on-surface">
            {attuale.didascalia}
          </figcaption>
        )}
      </figure>

      {foto.length > 1 && (
        <ul aria-label="Foto dell'evento" className="flex gap-space-xs overflow-x-auto pb-1">
          {foto.map((f, n) => (
            <li key={f.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndice(n)}
                aria-label={`Mostra la foto ${n + 1}${f.copertina ? ' (copertina)' : ''}`}
                aria-pressed={n === indice}
                className={cx(
                  'block overflow-hidden rounded-lg transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
                  n === indice ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100',
                )}
              >
                <img src={urlImmagine(f.url) ?? undefined} alt="" className="h-16 w-24 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
