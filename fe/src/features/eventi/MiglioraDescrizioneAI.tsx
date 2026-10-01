import { useId, useState } from 'react'
import { Icon } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import type { FotoResponse } from '@/types/api'

type MiglioraDescrizioneAIProps = {
  /** Foto dell'evento: l'AI ne riceve una insieme al testo */
  foto: FotoResponse[]
}

// Descrizione migliorata con l'AI (FE1-12), nella modifica dell'evento sotto il campo Descrizione.
// Il backend manda al provider una foto dell'evento e il testo, e restituisce una proposta che NON
// salva (progettazione v4, sezione 3). Passo 1: scelta della foto, di partenza la copertina.
export function MiglioraDescrizioneAI({ foto }: MiglioraDescrizioneAIProps) {
  const [fotoScelta, setFotoScelta] = useState<string>()
  const nomeGruppo = useId()
  const idTitolo = useId()
  // Se la foto scelta viene cancellata si torna alla copertina (o alla prima)
  const scelta = foto.find((f) => f.id === fotoScelta) ?? foto.find((f) => f.copertina) ?? foto[0]

  return (
    <section aria-labelledby={idTitolo} className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md">
      <h3 id={idTitolo} className="flex items-center gap-space-xs font-label-btn text-label-btn text-on-surface">
        <Icon nome="auto_awesome" size={18} className="text-accent-gold-piercing" />
        Migliora con l'AI
      </h3>

      {foto.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          L'AI scrive la proposta guardando una foto dell'evento:{' '}
          <a href="#foto" className="text-secondary hover:underline">
            carica almeno una foto
          </a>{' '}
          per usarla.
        </p>
      ) : (
        <fieldset className="flex flex-col gap-space-xs">
          <legend className="mb-space-xs font-body-sm text-body-sm text-on-surface-variant">
            Scegli la foto che l'AI guarderà insieme al testo:
          </legend>
          <div className="flex flex-wrap gap-space-xs">
            {foto.map((f, i) => {
              const selezionata = f.id === scelta?.id
              return (
                <label
                  key={f.id}
                  className={cx(
                    'relative size-16 cursor-pointer overflow-hidden rounded-lg ring-2 transition sm:size-20',
                    'has-[:focus-visible]:ring-primary-container',
                    selezionata ? 'ring-secondary' : 'opacity-70 ring-transparent hover:opacity-100',
                  )}
                >
                  <input
                    type="radio"
                    name={nomeGruppo}
                    value={f.id}
                    checked={selezionata}
                    onChange={() => setFotoScelta(f.id)}
                    className="sr-only"
                  />
                  <img src={urlImmagine(f.url) ?? undefined} alt={f.didascalia || `Foto ${i + 1}`} className="size-full object-cover" />
                  {selezionata && (
                    <span className="absolute right-1 top-1 rounded-full bg-surface-canvas/80 text-secondary">
                      <Icon nome="check_circle" size={18} piena />
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </fieldset>
      )}
    </section>
  )
}
