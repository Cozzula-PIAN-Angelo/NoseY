import { useAvviso } from '@/components/ui'
import { leggiErrore } from '@/lib/errori'
import { vaiAlLogin } from '@/lib/navigazione'
import type { Uuid } from '@/types/api'
import { useIscrivitiMutation } from './apiEventi'

// Iscrizione a un evento (FE1-06). Non serve sapere prima se l'utente ha fatto l'accesso:
// se non l'ha fatto il backend risponde 401 NON_AUTENTICATO e si va al login, con il ritorno
// alla pagina dell'evento. Dopo l'iscrizione RTK Query ricarica da solo dettaglio e ticket.
export function useIscrizione(eventoId: Uuid) {
  const [iscriviti, { isLoading }] = useIscrivitiMutation()
  const avviso = useAvviso()

  async function iscrivi() {
    try {
      const ticket = await iscriviti(eventoId).unwrap()
      avviso.successo('Iscrizione completata', `Il tuo ticket per «${ticket.evento.titolo}» è pronto.`)
    } catch (errore) {
      if (leggiErrore(errore).codice === 'NON_AUTENTICATO') {
        vaiAlLogin(`/events/${eventoId}`)
        return
      }
      avviso.erroreApi(errore)
    }
  }

  return { iscrivi, inCorso: isLoading }
}
