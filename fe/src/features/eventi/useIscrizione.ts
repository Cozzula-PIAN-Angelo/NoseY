import { useNavigate } from 'react-router'
import { useAvviso } from '@/components/ui'
import { leggiErrore } from '@/lib/errori'
import { urlLogin } from '@/lib/dopoLogin'
import type { Uuid } from '@/types/api'
import { useCancellaIscrizioneMutation, useIscrivitiMutation } from './apiEventi'
import { messaggioIscrizione, type AzioneIscrizione } from './messaggiIscrizione'

// Iscrizione a un evento e suo annullamento (FE1-06). Non serve sapere prima se l'utente ha fatto
// l'accesso: se non l'ha fatto il backend risponde 401 NON_AUTENTICATO e si va al login, con il
// ritorno alla pagina dell'evento. Dopo ogni azione RTK Query ricarica da solo dettaglio e ticket.
export function useIscrizione(eventoId: Uuid) {
  const [iscriviti, { isLoading: iscrizioneInCorso }] = useIscrivitiMutation()
  const [cancella, { isLoading: annullamentoInCorso }] = useCancellaIscrizioneMutation()
  const avviso = useAvviso()
  const navigate = useNavigate()

  /**
   * 401 → login; codici previsti (GIA_ISCRITTO, EVENTO_CONCLUSO...) → messaggio pensato per
   * l'iscrizione (messaggiIscrizione.ts); il resto → testo generico del codice.
   */
  function gestisciErrore(errore: unknown, azione: AzioneIscrizione) {
    const { codice } = leggiErrore(errore)
    if (codice === 'NON_AUTENTICATO') {
      navigate(urlLogin(`/events/${eventoId}`))
      return
    }
    const specifico = messaggioIscrizione(codice, azione)
    if (specifico) avviso[specifico.tipo](specifico.titolo, specifico.messaggio)
    else avviso.erroreApi(errore)
  }

  async function iscrivi() {
    try {
      const ticket = await iscriviti(eventoId).unwrap()
      avviso.successo('Iscrizione completata', `Il tuo ticket per «${ticket.evento.titolo}» è pronto.`)
    } catch (errore) {
      gestisciErrore(errore, 'iscrizione')
    }
  }

  /** Annulla l'iscrizione (solo eventi PROGRAMMATO); true se e' andata a buon fine */
  async function annulla(): Promise<boolean> {
    try {
      await cancella(eventoId).unwrap()
      avviso.info('Iscrizione annullata', 'Il ticket non è più valido. Puoi iscriverti di nuovo quando vuoi.')
      return true
    } catch (errore) {
      gestisciErrore(errore, 'annullamento')
      return false
    }
  }

  return { iscrivi, annulla, iscrizioneInCorso, annullamentoInCorso }
}
