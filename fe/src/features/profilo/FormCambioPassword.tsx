import { useState, type FormEvent } from 'react'
import { Button, CampoPassword, useAvviso } from '@/components/ui'
import { BarreRobustezza } from '@/features/accesso/BarreRobustezza'
import { useCambioPasswordMutation } from '@/features/utenti/apiUtenti'
import { leggiErrore } from '@/lib/errori'
import {
  ORDINE_PASSWORD,
  PASSWORD_VUOTE,
  validaPassword,
  type ErroriPassword,
  type ValoriPassword,
} from './validaProfilo'

// Cambio password dal profilo (FE2-07) → CambioPassword (POST /api/users/me/password).
// Nuova password con le barrette di robustezza della schermata Stitch "Registrazione Account".
// Il backend chiude le sessioni degli altri dispositivi ma non questa: qui non si esce.

const focusSu = (campo: keyof ValoriPassword) => document.getElementById(`pwd-${campo}`)?.focus()

export function FormCambioPassword({ email }: { email: string }) {
  const [cambioPassword, { isLoading }] = useCambioPasswordMutation()
  const avviso = useAvviso()
  const [v, setV] = useState<ValoriPassword>(PASSWORD_VUOTE)
  const [errori, setErrori] = useState<ErroriPassword>({})

  // L'errore di un campo sparisce appena lo si cambia (la conferma anche quando cambia la nuova)
  const cambia = (campo: keyof ValoriPassword, valore: string) => {
    setV((attuali) => ({ ...attuali, [campo]: valore }))
    setErrori((e) => ({ ...e, [campo]: undefined, ...(campo === 'nuova' ? { conferma: undefined } : {}) }))
  }

  /** Mostra gli errori e porta il cursore sul primo */
  function segnala(trovati: ErroriPassword) {
    setErrori(trovati)
    const primo = ORDINE_PASSWORD.find((c) => trovati[c])
    if (primo) focusSu(primo)
  }

  async function invia(e: FormEvent) {
    e.preventDefault()
    const trovati = validaPassword(v)
    segnala(trovati)
    if (Object.keys(trovati).length) return

    try {
      await cambioPassword({ passwordAttuale: v.attuale, nuovaPassword: v.nuova }).unwrap()
      setV(PASSWORD_VUOTE)
      avviso.successo(
        'Password cambiata',
        'Sei uscito dagli altri dispositivi, qui resti collegato. Ti abbiamo mandato un’email di conferma.',
      )
    } catch (err) {
      const letto = leggiErrore(err)
      switch (letto.codice) {
        case 'PASSWORD_ERRATA':
          setV((attuali) => ({ ...attuali, attuale: '' }))
          segnala({ attuale: 'Password attuale non corretta.' })
          break
        case 'PASSWORD_UGUALE':
          segnala({ nuova: 'La nuova password deve essere diversa da quella attuale.' })
          break
        case 'VALIDAZIONE':
          if (letto.campi.passwordAttuale || letto.campi.nuovaPassword)
            segnala({ attuale: letto.campi.passwordAttuale, nuova: letto.campi.nuovaPassword })
          else avviso.erroreApi(err)
          break
        default:
          avviso.erroreApi(err)
      }
    }
  }

  return (
    <form onSubmit={invia} noValidate className="flex flex-col gap-space-md">
      {/* Per i gestori di password: capiscono a quale account appartiene la nuova password */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <CampoPassword
        etichetta="Password attuale"
        obbligatorio
        autoComplete="current-password"
        value={v.attuale}
        onChange={(e) => cambia('attuale', e.target.value)}
        id="pwd-attuale"
        errore={errori.attuale}
        placeholder="La password che usi adesso"
      />

      <div className="flex flex-col gap-space-xs">
        <CampoPassword
          etichetta="Nuova password"
          obbligatorio
          autoComplete="new-password"
          value={v.nuova}
          onChange={(e) => cambia('nuova', e.target.value)}
          id="pwd-nuova"
          errore={errori.nuova}
          placeholder="Almeno 8 caratteri"
        />
        <BarreRobustezza password={v.nuova} />
      </div>

      <CampoPassword
        etichetta="Conferma la nuova password"
        obbligatorio
        autoComplete="new-password"
        value={v.conferma}
        onChange={(e) => cambia('conferma', e.target.value)}
        id="pwd-conferma"
        errore={errori.conferma}
        placeholder="Riscrivi la nuova password"
      />

      <div className="flex justify-end pt-space-sm">
        <Button type="submit" variant="gradient" icona="lock_reset" inCorso={isLoading}>
          Cambia password
        </Button>
      </div>
    </form>
  )
}
