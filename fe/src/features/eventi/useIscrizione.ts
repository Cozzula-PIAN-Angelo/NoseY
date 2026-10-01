import { useAvviso } from '@/components/ui'
import { leggiErrore } from '@/lib/errori'
import { vaiAlLogin } from '@/lib/navigazione'
import type { Uuid } from '@/types/api'
import { useCancellaIscrizioneMutation, useIscrivitiMutation } from './apiEventi'

// Iscrizione a un evento e suo annullamento (FE1-06). Non serve sapere prima se l'utente ha fatto
// l'accesso: se non l'ha fatto il backend risponde 401 NON_AUTENTICATO e si va al login, con il
// ritorno alla pagina dell'evento. Dopo ogni azione RTK Query ricarica da solo dettaglio e ticket.
export function useIscrizione(eventoId: Uuid) {
  const [iscriviti, { isLoading: iscrizioneInCorso }] = useIscrivitiMutation()
  const [cancella, { isLoading: annullamentoInCorso }] = useCancellaIscrizioneMutation()
  const avviso = useAvviso()

  /** 401 → login; gli altri errori come avviso */
  function gestisciErrore(errore: unknown) {
    if (leggiErrore(errore).codice === 'NON_AUTENTICATO') {
      vaiAlLogin(`/events/${eventoId}`)
      return
    }
    avviso.erroreApi(errore)
  }

  async function iscrivi() {
    try {
      const ticket = await iscriviti(eventoId).unwrap()
      avviso.successo('Iscrizione completata', `Il tuo ticket per «${ticket.evento.titolo}» è pronto.`)
    } catch (errore) {
      gestisciErrore(errore)
    }
  }

  /** Annulla l'iscrizione (solo eventi PROGRAMMATO); true se e' andata a buon fine */
  async function annulla(): Promise<boolean> {
    try {
      await cancella(eventoId).unwrap()
      avviso.info('Iscrizione annullata', 'Il ticket non è più valido. Puoi iscriverti di nuovo quando vuoi.')
      return true
    } catch (errore) {
      gestisciErrore(errore)
      return false
    }
  }

  return { iscrivi, annulla, iscrizioneInCorso, annullamentoInCorso }
}
