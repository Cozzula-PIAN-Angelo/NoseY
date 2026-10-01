import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button, useAvviso } from '@/components/ui'
import { useAppDispatch } from '@/hooks/redux'
import { useSessione } from '@/hooks/useSessione'
import { cx } from '@/lib/cx'
import type { ErroreWebSocket } from '@/lib/errori'
import { invia, iscriviti, useStatoConnessione, type StatoConnessione } from '@/lib/websocket'
import { CODE_WEBSOCKET, destinazioneInvio, LIMITI_SOCIAL, type MessaggioResponse, type Uuid } from '@/types/api'
import { apiSocial } from './apiSocial'

// Campo di scrittura della chat (FE2-12), come il fondo della colonna centrale della schermata Stitch
// "Community, Amicizie & Chat Live": stato della connessione e contatore "0 / 2000" sopra, campo e
// "Invia" sotto. Invio manda, Maiusc+Invio va a capo.
// InviaMessaggio passa dal WebSocket (progettazione v4, sezione 11): il messaggio compare nella
// conversazione quando il backend lo rimanda su /user/queue/messages. Fino ad allora il testo resta
// "in attesa": se invece arriva un errore su /user/queue/errors (sola lettura, troppi messaggi...)
// torna nel campo, cosi' non si perde.

const STATO: Record<StatoConnessione, { testo: string; colore: string }> = {
  connesso: { testo: 'In linea', colore: 'bg-poi-ingresso' },
  connessione: { testo: 'Connessione...', colore: 'bg-accent-gold-piercing animate-pulse' },
  riconnessione: { testo: 'Riconnessione...', colore: 'bg-accent-gold-piercing animate-pulse' },
  assente: { testo: 'Non connesso', colore: 'bg-status-annullato' },
}

/** Altezza massima del campo, poi scorre */
const ALTEZZA_MAX = 160

type FormMessaggioProps = {
  chatId: Uuid
  /** Nome dell'amico, per il segnaposto */
  nome: string
}

export function FormMessaggio({ chatId, nome }: FormMessaggioProps) {
  const [testo, setTesto] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)
  /** Testi inviati di cui non e' ancora tornato il messaggio, dal piu' vecchio */
  const inAttesa = useRef<string[]>([])
  const stato = useStatoConnessione()
  const io = useSessione().utente?.id
  const avviso = useAvviso()
  const dispatch = useAppDispatch()

  const pulito = testo.trim()
  const connesso = stato === 'connesso'

  useEffect(() => {
    inAttesa.current = []
    const annullaMessaggi = iscriviti<MessaggioResponse>(CODE_WEBSOCKET.messaggi, (m) => {
      if (m.chatId === chatId && m.mittenteId === io) inAttesa.current.shift()
    })
    // Gli errori non dicono a quale invio si riferiscono: vale il piu' vecchio in attesa.
    // Senza invii in attesa l'errore e' di un'altra scheda (la coda e' dell'utente, non della pagina).
    const annullaErrori = iscriviti<ErroreWebSocket>(CODE_WEBSOCKET.errori, (e) => {
      const nonInviato = inAttesa.current.shift()
      if (nonInviato === undefined) return
      setTesto((attuale) => (attuale.trim() ? attuale : nonInviato))
      // La chat e' diventata di sola lettura: l'elenco ricaricato porta puoiScrivere = false
      if (e.codice === 'CHAT_SOLA_LETTURA') dispatch(apiSocial.util.invalidateTags(['Chat']))
      // TOKEN_NON_VALIDO lo gestisce ConnessioneLive
      if (e.codice !== 'TOKEN_NON_VALIDO') avviso.erroreApi(e)
    })
    return () => {
      annullaMessaggi()
      annullaErrori()
    }
  }, [chatId, io, avviso, dispatch])

  // Il campo cresce con il testo fino a ALTEZZA_MAX
  useEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, ALTEZZA_MAX)}px`
  }, [testo])

  function inviaMessaggio(e?: FormEvent) {
    e?.preventDefault()
    if (!pulito || pulito.length > LIMITI_SOCIAL.testoMessaggio) return
    if (!invia(destinazioneInvio(chatId), { testo: pulito })) {
      avviso.attenzione('Non sei connesso', 'Il messaggio non è partito: riprova quando torna la connessione.')
      return
    }
    inAttesa.current.push(pulito)
    setTesto('')
    campo.current?.focus()
  }

  function tasto(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    e.preventDefault()
    if (connesso) inviaMessaggio()
  }

  const { testo: testoStato, colore } = STATO[stato]
  return (
    <form onSubmit={inviaMessaggio} className="flex shrink-0 flex-col gap-space-xs bg-surface-container-low p-space-md shadow-lg">
      <div className="flex items-center justify-between gap-space-sm">
        <span
          role="status"
          className="flex items-center gap-2 font-label-code-status text-label-code-status uppercase text-on-surface-variant"
        >
          <span aria-hidden="true" className={cx('size-2 rounded-full', colore)} />
          {testoStato}
        </span>
        <span
          className={cx(
            'font-label-code-status text-label-code-status',
            testo.length >= LIMITI_SOCIAL.testoMessaggio ? 'text-status-annullato' : 'text-outline',
          )}
        >
          {testo.length} / {LIMITI_SOCIAL.testoMessaggio}
        </span>
      </div>
      <div className="flex items-end gap-space-xs">
        <textarea
          ref={campo}
          rows={1}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          onKeyDown={tasto}
          maxLength={LIMITI_SOCIAL.testoMessaggio}
          aria-label={`Messaggio per ${nome}`}
          placeholder={`Scrivi a ${nome}...`}
          className={cx(
            'min-h-12 flex-1 resize-none rounded-lg bg-surface-canvas px-space-md py-3 text-on-surface',
            'font-body-md text-body-md placeholder:text-outline transition-all',
            'focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container',
          )}
        />
        <Button type="submit" variant="gradient" iconaDopo="send" className="h-12" disabled={!pulito || !connesso}>
          Invia
        </Button>
      </div>
    </form>
  )
}
