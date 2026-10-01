import { useEffect } from 'react'
import { apiEventi } from '@/features/eventi/apiEventi'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { iscriviti } from '@/lib/websocket'
import { mostraAvviso } from '@/store/avvisiSlice'
import { selezionaUtente } from '@/store/sessioneSlice'
import { CODE_WEBSOCKET, type MessaggioResponse, type NotificaResponse } from '@/types/api'
import { apiSocial } from './apiSocial'
import { aspettoNotifica } from './notifiche'

// Notifiche live (FE2-13, progettazione v4 sezioni 10 e 11), finche' c'e' la connessione: la usa
// components/layout/ConnessioneLive, in tutta l'app e non solo nella pagina delle notifiche.
// - /user/queue/notifications (solo events e friendships): avviso a comparsa con il testo e si
//   ricaricano il conteggio dei non letti e la lista della categoria. Un id gia' ricevuto e' una
//   notifica accorpata: ricaricando, la lista la sostituisce e il conteggio del backend non cresce.
//   Si ricarica anche cio' a cui la notifica si riferisce: chi sta guardando l'evento lo vede
//   cambiare (modifica, annullamento, nuove iscrizioni, foto rimossa), chi sta guardando gli amici
//   vede comparire la richiesta.
// - /user/queue/messages: per le chat non arrivano notifiche (sezione 10), il badge lo cambia il
//   messaggio dell'amico.

export function useNotificheLive() {
  const dispatch = useAppDispatch()
  const io = useAppSelector(selezionaUtente)?.id

  useEffect(() => {
    const annullaNotifiche = iscriviti<NotificaResponse>(CODE_WEBSOCKET.notifiche, (n) => {
      dispatch(apiSocial.util.invalidateTags(['NonLette', { type: 'Notifica', id: n.categoria }]))

      if (n.categoria === 'events' && n.tipo !== 'MANUALE') {
        const id = n.riferimentoId
        dispatch(
          apiEventi.util.invalidateTags([
            { type: 'Evento', id },
            { type: 'Poi', id },
            { type: 'Foto', id },
          ]),
        )
      } else if (n.categoria === 'friendships') {
        // Richiesta ricevuta o accettata: liste, chat nuova e stato nei partecipanti degli eventi
        dispatch(apiSocial.util.invalidateTags(['Amicizia', 'Chat', 'Partecipanti']))
      }

      const { titolo, avviso } = aspettoNotifica(n)
      dispatch(mostraAvviso({ tipo: avviso, titolo, messaggio: n.testo }))
    })

    const annullaMessaggi = iscriviti<MessaggioResponse>(CODE_WEBSOCKET.messaggi, (m) => {
      if (m.mittenteId !== io) dispatch(apiSocial.util.invalidateTags(['NonLette', { type: 'Notifica', id: 'chats' }]))
    })

    return () => {
      annullaNotifiche()
      annullaMessaggi()
    }
  }, [dispatch, io])
}
