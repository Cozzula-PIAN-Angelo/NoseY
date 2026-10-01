import { useEffect, useState } from 'react'
import { Button, Icon, useAvviso } from '@/components/ui'
import { leggiErrore } from '@/lib/errori'
import { LIMITI_UTENTI } from '@/types/api'
import { usePasswordDimenticataMutation, useReinviaCodiceMutation } from '@/features/utenti/apiUtenti'
import { segnaInvioCodice, ultimoInvioCodice } from './registrazioneInCorso'

// «Reinvia il codice» con l'attesa fra un invio e l'altro (FE1-18, passo 7), come il riquadro
// "Cooldown invio codice" della schermata Stitch. Il backend accetta un invio ogni 60 secondi e
// al massimo 5 al giorno, e risponde 204 anche per email sconosciute (non rivela chi e' registrato).
// Con scopo="reset" (FE2-06) rimanda il codice per reimpostare la password (PasswordDimenticata):
// i limiti sono gli stessi e valgono per account, quindi l'attesa e' in comune.

const ATTESA_MS = LIMITI_UTENTI.secondiTraInvii * 1000

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

type ReinvioCodiceProps = {
  email: string
  /** Codice di verifica dell'email (predefinito) o di reset della password */
  scopo?: 'verifica' | 'reset'
}

export function ReinvioCodice({ email, scopo = 'verifica' }: ReinvioCodiceProps) {
  const [reinviaVerifica, statoVerifica] = useReinviaCodiceMutation()
  const [reinviaReset, statoReset] = usePasswordDimenticataMutation()
  const reinvia = scopo === 'reset' ? reinviaReset : reinviaVerifica
  const isLoading = scopo === 'reset' ? statoReset.isLoading : statoVerifica.isLoading
  const avviso = useAvviso()
  // Fine dell'attesa: se il codice e' appena partito (registrazione in questa scheda) si aspetta subito
  const [fineAttesa, setFineAttesa] = useState(() => {
    const ultimo = ultimoInvioCodice(email)
    return ultimo ? ultimo + ATTESA_MS : 0
  })
  const [adesso, setAdesso] = useState(() => Date.now())
  const restante = Math.max(0, fineAttesa - adesso)

  // Un aggiornamento al secondo, solo finche' si aspetta
  useEffect(() => {
    if (fineAttesa <= Date.now()) return
    const timer = setInterval(() => setAdesso(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [fineAttesa])

  function avviaAttesa() {
    const ora = Date.now()
    segnaInvioCodice(email, ora)
    setAdesso(ora)
    setFineAttesa(ora + ATTESA_MS)
  }

  async function invia() {
    try {
      await reinvia({ email: email.trim() }).unwrap()
      avviso.successo(
        'Nuovo codice inviato',
        `Se ${email.trim()} è registrata e ${scopo === 'reset' ? 'verificata' : 'non ancora verificata'}, il codice arriva tra poco.`,
      )
      avviaAttesa()
    } catch (err) {
      if (leggiErrore(err).codice === 'TROPPE_RICHIESTE') {
        avviso.attenzione('Aspetta ancora un po’', 'Si può chiedere un nuovo codice una volta al minuto, al massimo 5 volte al giorno.')
        avviaAttesa()
      } else {
        avviso.erroreApi(err)
      }
    }
  }

  const inAttesa = restante > 0
  const emailValida = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-container-low p-space-md">
      <div className="flex items-center justify-between gap-space-sm">
        <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface">
          <Icon nome="timer" size={18} className="text-tertiary" />
          {inAttesa ? 'Attesa prima del reinvio' : 'Non ti è arrivato il codice?'}
        </span>
        {inAttesa && (
          <span aria-live="off" className="font-label-code-status text-label-code-status uppercase text-tertiary">
            Reinvia tra {mmss(restante)}
          </span>
        )}
      </div>

      {/* Barra che si accorcia durante l'attesa */}
      <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-full rounded-full bg-gradient-to-r from-tertiary to-secondary transition-[width] duration-1000 ease-linear"
          style={{ width: `${(restante / ATTESA_MS) * 100}%` }}
        />
      </div>

      <Button
        variant="secondary"
        icona="forward_to_inbox"
        onClick={invia}
        inCorso={isLoading}
        disabled={inAttesa || !emailValida}
        className="self-start"
      >
        Reinvia il codice via email
      </Button>

      <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-outline">
        <Icon nome="info" size={16} className="mt-0.5" />
        Puoi chiedere un nuovo codice una volta al minuto, al massimo 5 volte al giorno. Controlla anche la cartella spam.
      </p>
    </div>
  )
}
