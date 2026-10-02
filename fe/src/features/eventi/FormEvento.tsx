import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { CercaIndirizzo, Mappa, useIndirizzo, type Coordinate } from '@/components/mappa'
import { Button, DateTimeField, Icon, TextArea, TextField } from '@/components/ui'
import { nelFuturo } from '@/lib/date'
import { LIMITI_EVENTI } from '@/types/api'
import { usePosizioneUtente } from './usePosizioneUtente'

// Form dell'evento (FE1-07), lo stesso per la creazione e per la modifica.
// Le date sono i valori dei campi datetime-local (ora locale): la conversione in ISO con il fuso
// la fa chi invia (lib/date.ts). La posizione si sceglie cliccando sulla mappa o cercando una via
// (CercaIndirizzo); sotto la mappa si vede la via del punto scelto, non le coordinate.

export type ValoriEvento = {
  titolo: string
  descrizione: string
  /** "2026-10-03T21:00" */
  inizio: string
  fine: string
  posizione: Coordinate | null
}

export type ErroriEvento = Partial<Record<keyof ValoriEvento, string>>

const NESSUN_ERRORE: ErroriEvento = {}

export const VALORI_VUOTI: ValoriEvento = { titolo: '', descrizione: '', inizio: '', fine: '', posizione: null }

/** Centro della mappa se non c'e' ancora una posizione: Roma */
const CENTRO_PREDEFINITO = { lat: 41.8967, lng: 12.4822 }

/**
 * Controlli prima dell'invio, gli stessi del backend (EventoRequest): cosi' l'utente vede subito
 * l'errore sul campo. Le date si controllano solo se sono cambiate: in modifica un evento gia'
 * iniziato puo' tenere la sua data d'inizio passata.
 */
export function validaEvento(v: ValoriEvento, iniziali: ValoriEvento): ErroriEvento {
  const errori: ErroriEvento = {}
  if (!v.titolo.trim()) errori.titolo = 'Il titolo è obbligatorio'
  else if (v.titolo.length > LIMITI_EVENTI.titolo) errori.titolo = `Massimo ${LIMITI_EVENTI.titolo} caratteri`
  if (v.descrizione.length > LIMITI_EVENTI.descrizione) errori.descrizione = `Massimo ${LIMITI_EVENTI.descrizione} caratteri`
  if (!v.inizio) errori.inizio = "Indica quando inizia l'evento"
  else if (v.inizio !== iniziali.inizio && !nelFuturo(v.inizio)) errori.inizio = "L'inizio deve essere nel futuro"
  if (!v.fine) errori.fine = "Indica quando finisce l'evento"
  else if (v.fine !== iniziali.fine && !nelFuturo(v.fine)) errori.fine = 'La fine deve essere nel futuro'
  else if (v.inizio && new Date(v.fine) <= new Date(v.inizio)) errori.fine = "La fine deve essere dopo l'inizio"
  if (!v.posizione) errori.posizione = 'Clicca sulla mappa o cerca una via per indicare dove si svolge'
  return errori
}

type FormEventoProps = {
  /** Valori di partenza: vuoti in creazione, quelli dell'evento in modifica */
  iniziali?: ValoriEvento
  testoInvio: string
  inCorso?: boolean
  /** Errori arrivati dal backend, da mostrare sui campi */
  erroriServer?: ErroriEvento
  /** L'evento e' gia' iniziato: la data d'inizio non si puo' piu' cambiare (EVENTO_GIA_INIZIATO) */
  inizioBloccato?: boolean
  onInvia: (valori: ValoriEvento) => void
  /**
   * Contenuto sotto il campo Descrizione (in modifica: il miglioramento con l'AI, FE1-12), con il
   * testo scritto finora, anche se non ancora salvato, e il modo di sostituirlo
   */
  sottoDescrizione?: (descrizione: string, cambiaDescrizione: (testo: string) => void) => ReactNode
}

export function FormEvento({
  iniziali = VALORI_VUOTI,
  testoInvio,
  inCorso = false,
  erroriServer = NESSUN_ERRORE,
  inizioBloccato = false,
  onInvia,
  sottoDescrizione,
}: FormEventoProps) {
  const [valori, setValori] = useState<ValoriEvento>(iniziali)
  const [errori, setErrori] = useState<ErroriEvento>({})
  const posizioneUtente = usePosizioneUtente()
  /** Punto dell'ultima via cercata: solo in quel caso la mappa segue il punto scelto */
  const [centroCercato, setCentroCercato] = useState<Coordinate | null>(null)
  const indirizzo = useIndirizzo(valori.posizione)
  const centro = centroCercato ?? posizioneUtente.posizione ?? iniziali.posizione ?? CENTRO_PREDEFINITO

  const cambia = <K extends keyof ValoriEvento>(campo: K, valore: ValoriEvento[K]) => {
    setValori((v) => ({ ...v, [campo]: valore }))
    setErrori((e) => ({ ...e, [campo]: undefined }))
  }

  // Gli errori del backend si mostrano sui campi quando arrivano e spariscono quando l'utente
  // cambia quel campo (cambia() li toglie), come quelli trovati prima dell'invio
  useEffect(() => {
    if (Object.keys(erroriServer).length) setErrori((e) => ({ ...e, ...erroriServer }))
  }, [erroriServer])

  const errore = (campo: keyof ValoriEvento) => errori[campo]

  function invia(e: FormEvent) {
    e.preventDefault()
    const trovati = validaEvento(valori, iniziali)
    setErrori(trovati)
    if (Object.keys(trovati).length === 0) onInvia(valori)
  }

  return (
    <form onSubmit={invia} noValidate className="grid gap-space-lg lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-space-md">
        <TextField
          etichetta="Titolo"
          obbligatorio
          maxLength={LIMITI_EVENTI.titolo}
          value={valori.titolo}
          onChange={(e) => cambia('titolo', e.target.value)}
          errore={errore('titolo')}
          placeholder="Es. Chronos: Parallel Frequencies"
        />
        <TextArea
          etichetta="Descrizione"
          rows={7}
          maxLength={LIMITI_EVENTI.descrizione}
          value={valori.descrizione}
          onChange={(e) => cambia('descrizione', e.target.value)}
          errore={errore('descrizione')}
          aiuto="Facoltativa: potrai migliorarla con l'AI dopo aver caricato una foto."
        />
        {sottoDescrizione?.(valori.descrizione, (testo) => cambia('descrizione', testo))}
        <div className="grid gap-space-md sm:grid-cols-2">
          <DateTimeField
            etichetta="Inizio"
            obbligatorio
            min={inizioBloccato ? undefined : new Date()}
            value={valori.inizio}
            onChange={(e) => cambia('inizio', e.target.value)}
            errore={errore('inizio')}
            disabled={inizioBloccato}
            aiuto={inizioBloccato ? "L'evento è già iniziato: l'inizio non si può cambiare." : undefined}
          />
          <DateTimeField
            etichetta="Fine"
            obbligatorio
            min={valori.inizio || new Date()}
            value={valori.fine}
            onChange={(e) => cambia('fine', e.target.value)}
            errore={errore('fine')}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-space-sm">
        <legend className="mb-space-xs font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
          Dove si svolge<span aria-hidden="true" className="ml-0.5 text-tertiary">*</span>
        </legend>
        <CercaIndirizzo
          vicinoA={centro}
          onScegli={(r) => {
            cambia('posizione', r.punto)
            setCentroCercato(r.punto)
          }}
        />
        <Mappa
          etichetta="Scegli la posizione dell'evento: clicca sulla mappa"
          // Il centro non segue il punto cliccato (la mappa resta ferma), solo la via cercata
          centro={centro}
          zoom={centroCercato || posizioneUtente.posizione || iniziali.posizione ? 15 : 12}
          puntoScelto={valori.posizione}
          onScegliPunto={(p) => cambia('posizione', p)}
          className="h-80"
        />
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          {/* aria-live: chi usa lo screen reader sente la via appena arriva */}
          <p aria-live="polite" className="font-body-sm text-body-sm text-on-surface-variant">
            {indirizzo.stato !== 'nessun-punto' ? (
              <>
                Posizione: <span className="text-on-surface">{indirizzo.testo}</span> · trascina il segnaposto per spostarla
              </>
            ) : (
              'Clicca sulla mappa o cerca una via per indicare dove si svolge l’evento.'
            )}
          </p>
          <Button
            variant="ghost"
            size="sm"
            icona="my_location"
            onClick={() => {
              // La mappa torna a seguire la posizione dell'utente, non l'ultima via cercata
              setCentroCercato(null)
              posizioneUtente.chiedi()
            }}
            inCorso={posizioneUtente.stato === 'in-attesa'}
          >
            Vai alla mia posizione
          </Button>
        </div>
        {errore('posizione') && (
          <p role="alert" className="flex items-center gap-1 font-body-sm text-body-sm text-status-annullato">
            <Icon nome="error" size={16} />
            {errore('posizione')}
          </p>
        )}
      </fieldset>

      <div className="flex justify-end lg:col-span-2">
        <Button type="submit" size="lg" icona="check" inCorso={inCorso}>
          {testoInvio}
        </Button>
      </div>
    </form>
  )
}
