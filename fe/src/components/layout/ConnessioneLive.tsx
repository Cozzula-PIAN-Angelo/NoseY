import { useEffect, useState } from 'react'
import { apiSocial } from '@/features/social/apiSocial'
import { useNotificheLive } from '@/features/social/useNotificheLive'
import { apiUtenti } from '@/features/utenti/apiUtenti'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import type { ErroreWebSocket } from '@/lib/errori'
import { connetti, disconnetti, fermaPerToken, iscriviti } from '@/lib/websocket'
import { selezionaToken } from '@/store/sessioneSlice'

// Connessione WebSocket finche' c'e' una sessione (FE2-11, progettazione v4 sezione 11,
// decisione 22). Il client e' in lib/websocket.ts; qui si decide quando aprirla e chiuderla:
// - si apre con il token della sessione, si chiude all'uscita o se il token cambia
// - dopo una riconnessione si ricaricano ContaNonLette, le chat e le notifiche: cio' che e'
//   arrivato mentre la connessione era giu' non e' passato dal WebSocket
// - TOKEN_NON_VALIDO: si controlla la sessione con GET /api/users/me. Un 401 la chiude
//   tramite apiSlice (avviso e login); se invece risponde, si riprova piu' tardi.
// - notifiche live e badge della campanella: useNotificheLive (FE2-13).

/** Attesa prima di riprovare quando il backend rifiuta un token che per le API e' ancora valido */
const NUOVO_TENTATIVO_MS = 30_000

export function ConnessioneLive() {
  const token = useAppSelector(selezionaToken)
  const dispatch = useAppDispatch()
  // Cambia per riaprire la connessione dopo un TOKEN_NON_VALIDO non confermato dalle API
  const [tentativo, setTentativo] = useState(0)
  useNotificheLive()

  useEffect(() => {
    if (!token) return
    let attivo = true
    let timer: ReturnType<typeof setTimeout> | undefined

    connetti(token, {
      riconnesso: () => {
        dispatch(apiSocial.util.invalidateTags(['NonLette', 'Chat', 'Messaggi', 'Notifica']))
      },
      tokenNonValido: async () => {
        await dispatch(apiUtenti.endpoints.vediProfilo.initiate(undefined, { forceRefetch: true, subscribe: false }))
        // Con un 401 la sessione e' gia' chiusa e questo effetto smontato; con altri errori
        // (backend irraggiungibile) si riprova come quando risponde
        if (!attivo) return
        timer = setTimeout(() => setTentativo((t) => t + 1), NUOVO_TENTATIVO_MS)
      },
    })

    // Dopo un SEND il token scaduto o revocato arriva qui, non come frame ERROR
    const annulla = iscriviti<ErroreWebSocket>('/user/queue/errors', (e) => {
      if (e.codice === 'TOKEN_NON_VALIDO') fermaPerToken()
    })

    return () => {
      attivo = false
      clearTimeout(timer)
      annulla()
      disconnetti()
    }
  }, [token, tentativo, dispatch])

  return null
}
