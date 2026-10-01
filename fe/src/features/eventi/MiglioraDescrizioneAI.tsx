import { useId, useState } from 'react'
import { Button, Icon, Scheletro, useAvviso } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'
import { leggiErrore } from '@/lib/errori'
import type { FotoResponse, Uuid } from '@/types/api'
import { useMiglioraDescrizioneMutation, useModificaEventoMutation } from './apiEventi'

type MiglioraDescrizioneAIProps = {
  eventoId: Uuid
  /** Foto dell'evento: l'AI ne riceve una insieme al testo */
  foto: FotoResponse[]
  /** Il testo del campo Descrizione, anche se non ancora salvato */
  descrizione: string
  /** Sostituisce il testo del campo dopo che la proposta e' stata salvata */
  onAccettata: (testo: string) => void
}

/** Messaggio sotto il pulsante per gli errori previsti dall'AI */
type Problema = { icona: string; testo: string; riprova: boolean }

// Descrizione migliorata con l'AI (FE1-12), nella modifica dell'evento sotto il campo Descrizione.
// Il backend manda al provider una foto dell'evento e il testo, e restituisce una proposta che NON
// salva (progettazione v4, sezione 3). Passi:
//   1. scelta della foto, di partenza la copertina
//   2. invio del testo del campo, anche se non ancora salvato
//   3. proposta accanto al testo inviato: "Usa questa" la salva subito (PATCH { descrizione }), "Scarta"
//   4. attesa lunga (l'AI impiega qualche secondo) e messaggi per TROPPE_RICHIESTE e SERVIZIO_ESTERNO
export function MiglioraDescrizioneAI({ eventoId, foto, descrizione, onAccettata }: MiglioraDescrizioneAIProps) {
  const [fotoScelta, setFotoScelta] = useState<string>()
  // Testo inviato e proposta ricevuta: l'originale resta quello inviato anche se poi si modifica il campo
  const [proposta, setProposta] = useState<{ originale: string; testo: string } | null>(null)
  const [problema, setProblema] = useState<Problema | null>(null)
  const [migliora, { isLoading: inAttesa }] = useMiglioraDescrizioneMutation()
  const [modifica, { isLoading: salvataggio }] = useModificaEventoMutation()
  const avviso = useAvviso()
  const nomeGruppo = useId()
  const idTitolo = useId()
  // Se la foto scelta viene cancellata si torna alla copertina (o alla prima)
  const scelta = foto.find((f) => f.id === fotoScelta) ?? foto.find((f) => f.copertina) ?? foto[0]
  const testo = descrizione.trim()

  async function chiediProposta() {
    if (!scelta || !testo) return
    setProblema(null)
    setProposta(null)
    try {
      const { descrizioneProposta } = await migliora({ id: eventoId, dati: { fotoId: scelta.id, descrizione: testo } }).unwrap()
      setProposta({ originale: testo, testo: descrizioneProposta })
    } catch (err) {
      const { codice } = leggiErrore(err)
      if (codice === 'TROPPE_RICHIESTE') {
        setProblema({
          icona: 'schedule',
          testo: "Hai chiesto molte proposte nell'ultima ora (al massimo 10): riprova più tardi.",
          riprova: false,
        })
      } else if (codice === 'SERVIZIO_ESTERNO') {
        setProblema({
          icona: 'cloud_off',
          testo: 'Il servizio di AI non risponde in questo momento. Il tuo testo non è cambiato: riprova tra poco.',
          riprova: true,
        })
      } else {
        avviso.erroreApi(err)
      }
    }
  }

  async function usaProposta() {
    if (!proposta) return
    try {
      await modifica({ id: eventoId, dati: { descrizione: proposta.testo } }).unwrap()
      onAccettata(proposta.testo)
      setProposta(null)
      avviso.successo('Descrizione aggiornata', 'La proposta è ora la descrizione dell’evento.')
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
          <fieldset className="flex flex-col gap-space-xs" disabled={inAttesa || salvataggio}>
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
              disabled={!testo || salvataggio}
              inCorso={inAttesa}
            >
              {proposta ? 'Chiedi un’altra proposta' : 'Proponi una descrizione'}
            </Button>
            {!testo && (
              <span className="font-body-sm text-body-sm text-outline">Scrivi qualche riga nella descrizione: l'AI la migliora.</span>
            )}
          </div>

          {inAttesa && (
            <div role="status" className="flex flex-col gap-space-xs">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                L'AI sta scrivendo la proposta: può volerci qualche secondo.
              </p>
              <Scheletro className="h-4 w-full" />
              <Scheletro className="h-4 w-11/12" />
              <Scheletro className="h-4 w-3/5" />
            </div>
          )}

          {problema && (
            <div role="alert" className="flex flex-wrap items-start gap-space-sm rounded-xl bg-tertiary/10 p-space-sm">
              <Icon nome={problema.icona} size={18} className="mt-0.5 shrink-0 text-tertiary" />
              <p className="min-w-0 flex-1 font-body-sm text-body-sm text-on-surface">{problema.testo}</p>
              {problema.riprova && (
                <Button variant="ghost" size="sm" icona="refresh" onClick={chiediProposta}>
                  Riprova
                </Button>
              )}
            </div>
          )}

          {proposta && (
            <div className="flex flex-col gap-space-sm">
              <div className="grid gap-space-sm md:grid-cols-2">
                <figure className="flex flex-col gap-1 rounded-lg bg-surface-container p-space-sm">
                  <figcaption className="font-label-code-status text-label-code-status uppercase text-outline">Il tuo testo</figcaption>
                  <p className="whitespace-pre-line font-body-sm text-body-sm text-on-surface-variant">{proposta.originale}</p>
                </figure>
                <figure className="flex flex-col gap-1 rounded-lg bg-surface-container p-space-sm ring-1 ring-accent-gold-piercing/40">
                  <figcaption className="flex items-center gap-1 font-label-code-status text-label-code-status uppercase text-accent-gold-piercing">
                    <Icon nome="auto_awesome" size={14} />
                    Proposta dell'AI
                  </figcaption>
                  <p className="whitespace-pre-line font-body-sm text-body-sm text-on-surface">{proposta.testo}</p>
                </figure>
              </div>
              <p className="font-body-sm text-body-sm text-outline">
                «Usa questa» salva subito la descrizione: i partecipanti ricevono la notifica della modifica.
              </p>
              <div className="flex flex-wrap gap-space-sm">
                <Button size="sm" icona="check" onClick={usaProposta} inCorso={salvataggio}>
                  Usa questa
                </Button>
                <Button variant="ghost" size="sm" icona="close" onClick={() => setProposta(null)} disabled={salvataggio}>
                  Scarta
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
