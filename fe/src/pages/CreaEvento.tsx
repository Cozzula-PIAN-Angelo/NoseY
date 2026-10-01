import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAvviso } from '@/components/ui'
import { useCreaEventoMutation } from '@/features/eventi/apiEventi'
import { erroriSuiCampi } from '@/features/eventi/erroriEvento'
import { FormEvento, type ErroriEvento, type ValoriEvento } from '@/features/eventi/FormEvento'
import { istanteDaLocale } from '@/lib/date'
import type { EventoRequest } from '@/types/api'

// Creazione di un evento (FE1-07), rotta /events/new (solo con il login).
export default function CreaEvento() {
  const [crea, { isLoading }] = useCreaEventoMutation()
  const avviso = useAvviso()
  const navigate = useNavigate()
  const [erroriServer, setErroriServer] = useState<ErroriEvento>({})

  async function invia(v: ValoriEvento) {
    const dati: EventoRequest = {
      titolo: v.titolo.trim(),
      // Descrizione vuota = non inviata (e' facoltativa)
      descrizione: v.descrizione.trim() || undefined,
      dataEvento: istanteDaLocale(v.inizio),
      dataFine: istanteDaLocale(v.fine),
      lat: v.posizione!.lat,
      lng: v.posizione!.lng,
    }
    try {
      const evento = await crea(dati).unwrap()
      avviso.successo('Evento creato', `«${evento.titolo}» è sulla mappa. Ora aggiungi qualche foto.`)
      // Passo successivo: le foto (la prima diventa la copertina, e serve anche all'AI)
      navigate(`/events/${evento.id}/edit#foto`)
    } catch (errore) {
      const campi = erroriSuiCampi(errore, dati)
      if (campi) {
        setErroriServer(campi)
        avviso.attenzione('Controlla i campi evidenziati', 'Alcuni dati non vanno bene: trovi la spiegazione sotto ogni campo.')
      } else avviso.erroreApi(errore)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-xs">
        <p className="font-label-code-status text-label-code-status uppercase tracking-wider text-tertiary">Nuovo evento</p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Crea evento</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Dopo la creazione potrai aggiungere foto, line-up e punti della mappa interna.
        </p>
      </header>
      <div className="rounded-2xl bg-surface-card p-space-md sm:p-space-lg">
        <FormEvento testoInvio="Crea evento" inCorso={isLoading} erroriServer={erroriServer} onInvia={invia} />
      </div>
    </div>
  )
}
