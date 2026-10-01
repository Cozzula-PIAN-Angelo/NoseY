import { useId, useState } from 'react'
import { Button, Icon, useAvviso } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import type { FotoResponse, Uuid } from '@/types/api'
import { useMiglioraDescrizioneMutation } from './apiEventi'

type MiglioraDescrizioneAIProps = {
  eventoId: Uuid
  /** Foto dell'evento: l'AI ne riceve una insieme al testo */
  foto: FotoResponse[]
  /** Il testo del campo Descrizione, anche se non ancora salvato */
  descrizione: string
}

// Descrizione migliorata con l'AI (FE1-12), nella modifica dell'evento sotto il campo Descrizione.
// Il backend manda al provider una foto dell'evento e il testo, e restituisce una proposta che NON
// salva (progettazione v4, sezione 3). Passi:
//   1. scelta della foto, di partenza la copertina
//   2. invio del testo del campo, anche se non ancora salvato
export function MiglioraDescrizioneAI({ eventoId, foto, descrizione }: MiglioraDescrizioneAIProps) {
  const [fotoScelta, setFotoScelta] = useState<string>()
  // Testo inviato e proposta ricevuta: l'originale resta quello inviato anche se poi si modifica il campo
  const [proposta, setProposta] = useState<{ originale: string; testo: string } | null>(null)
  const [migliora, { isLoading: inAttesa }] = useMiglioraDescrizioneMutation()
  const avviso = useAvviso()
  const nomeGruppo = useId()
  const idTitolo = useId()
  // Se la foto scelta viene cancellata si torna alla copertina (o alla prima)
  const scelta = foto.find((f) => f.id === fotoScelta) ?? foto.find((f) => f.copertina) ?? foto[0]
  const testo = descrizione.trim()

  async function chiediProposta() {
    if (!scelta || !testo) return
    setProposta(null)
    try {
      const { descrizioneProposta } = await migliora({ id: eventoId, dati: { fotoId: scelta.id, descrizione: testo } }).unwrap()
      setProposta({ originale: testo, testo: descrizioneProposta })
    } catch (err) {
      avviso.erroreApi(err)
    }
  }

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
        <>
          <fieldset className="flex flex-col gap-space-xs" disabled={inAttesa}>
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

          <div className="flex flex-wrap items-center gap-space-sm">
            <Button
              variant="secondary"
              size="sm"
              icona="auto_awesome"
              onClick={chiediProposta}
              disabled={!testo}
              inCorso={inAttesa}
            >
              {proposta ? 'Chiedi un’altra proposta' : 'Proponi una descrizione'}
            </Button>
            {!testo && (
              <span className="font-body-sm text-body-sm text-outline">Scrivi qualche riga nella descrizione: l'AI la migliora.</span>
            )}
          </div>

          {proposta && (
            <figure className="flex flex-col gap-1 rounded-lg bg-surface-container p-space-sm ring-1 ring-accent-gold-piercing/40">
              <figcaption className="flex items-center gap-1 font-label-code-status text-label-code-status uppercase text-accent-gold-piercing">
                <Icon nome="auto_awesome" size={14} />
                Proposta dell'AI
              </figcaption>
              <p className="whitespace-pre-line font-body-sm text-body-sm text-on-surface">{proposta.testo}</p>
            </figure>
          )}
        </>
      )}
    </section>
  )
}
