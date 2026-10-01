import { useNavigate } from 'react-router'
import { useAvviso } from '@/components/ui'
import { useCreaEventoMutation } from '@/features/eventi/apiEventi'
import { FormEvento, type ValoriEvento } from '@/features/eventi/FormEvento'
import { istanteDaLocale } from '@/lib/date'

// Creazione di un evento (FE1-07), rotta /events/new (solo con il login).
export default function CreaEvento() {
  const [crea, { isLoading }] = useCreaEventoMutation()
  const avviso = useAvviso()
  const navigate = useNavigate()

  async function invia(v: ValoriEvento) {
    try {
      const evento = await crea({
        titolo: v.titolo.trim(),
        // Descrizione vuota = non inviata (e' facoltativa)
        descrizione: v.descrizione.trim() || undefined,
        dataEvento: istanteDaLocale(v.inizio),
        dataFine: istanteDaLocale(v.fine),
        lat: v.posizione!.lat,
        lng: v.posizione!.lng,
      }).unwrap()
      avviso.successo('Evento creato', `«${evento.titolo}» è sulla mappa.`)
      navigate(`/events/${evento.id}`)
    } catch (errore) {
      avviso.erroreApi(errore)
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
        <FormEvento testoInvio="Crea evento" inCorso={isLoading} onInvia={invia} />
      </div>
    </div>
  )
}
