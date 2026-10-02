import { useState, type FormEvent } from 'react'
import { Button, CampoPassword, ConfirmDialog, Icon, useAvviso } from '@/components/ui'
import { useAnonimizzazioneMutation } from '@/features/utenti/apiUtenti'
import { leggiErrore } from '@/lib/errori'

// Eliminazione dell'account dal profilo (FE2-14) → Anonimizzazione (POST /api/users/me/anonymize).
// Prima di tutto un avviso chiaro: l'operazione e' irreversibile. L'elenco riassume gli effetti
// descritti nella progettazione v4 (sezione 2, "Anonimizzazione"), con parole da utente.
// Stessi colori degli errori (status-annullato), come MessaggioErrore e ConfirmDialog "danger".
// Si conferma con la password (il backend la richiede), poi con la finestra di conferma "danger":
// una password sbagliata e' 400 PASSWORD_ERRATA, non 401, quindi la sessione resta.

const EFFETTI = [
  { icona: 'person_off', testo: 'Nome, email, indirizzo, data di nascita e immagine del profilo vengono cancellati.' },
  { icona: 'lock', testo: 'Non potrai più entrare con questo account, nemmeno reimpostando la password.' },
  { icona: 'event_busy', testo: 'I tuoi eventi in programma vengono annullati e chi partecipa riceve un avviso.' },
  { icona: 'confirmation_number', testo: 'Le iscrizioni agli eventi futuri vengono cancellate. I ticket degli eventi passati restano.' },
  { icona: 'group', testo: 'Le richieste di amicizia in attesa vengono ritirate. Per i tuoi amici diventi «Utente anonimo».' },
  { icona: 'forum', testo: 'I messaggi che hai scritto restano, firmati «Utente anonimo». Le tue notifiche vengono cancellate.' },
]

const focusPassword = () => document.getElementById('elimina-password')?.focus()

export function EliminaAccount({ email }: { email: string }) {
  const [anonimizzazione, { isLoading }] = useAnonimizzazioneMutation()
  const avviso = useAvviso()
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string>()
  const [conferma, setConferma] = useState(false)

  function segnala(messaggio: string) {
    setErrore(messaggio)
    focusPassword()
  }

  /** Il form controlla solo che la password ci sia, poi chiede la conferma finale */
  function chiediConferma(e: FormEvent) {
    e.preventDefault()
    if (!password) return segnala('Scrivi la tua password per confermare.')
    setConferma(true)
  }

  async function elimina() {
    try {
      await anonimizzazione({ password }).unwrap()
      setConferma(false)
    } catch (err) {
      setConferma(false)
      const letto = leggiErrore(err)
      switch (letto.codice) {
        case 'PASSWORD_ERRATA':
          setPassword('')
          segnala('Password non corretta.')
          break
        case 'VALIDAZIONE':
          if (letto.campi.password) segnala(letto.campi.password)
          else avviso.erroreApi(err)
          break
        default:
          avviso.erroreApi(err)
      }
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div role="note" className="flex items-start gap-space-sm rounded-xl bg-status-annullato/10 p-space-md">
        <Icon nome="warning" size={22} className="shrink-0 text-status-annullato" />
        <div className="flex flex-col gap-1">
          <p className="font-label-btn text-label-btn text-status-annullato">L’operazione è irreversibile</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Una volta eliminato, l’account non si può recuperare: né noi né tu potremo riattivarlo.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-space-sm">
        {EFFETTI.map((e) => (
          <li key={e.icona} className="flex items-start gap-space-sm font-body-md text-body-md text-on-surface-variant">
            <Icon nome={e.icona} size={20} className="mt-0.5 shrink-0 text-outline" />
            <span>{e.testo}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={chiediConferma} noValidate className="flex flex-col gap-space-md border-t border-outline-variant/30 pt-space-md">
        {/* Per i gestori di password: capiscono a quale account appartiene la password */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

        <CampoPassword
          etichetta="Conferma con la tua password"
          obbligatorio
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setErrore(undefined)
          }}
          id="elimina-password"
          errore={errore}
          placeholder="La password che usi adesso"
        />

        <div className="flex justify-end pt-space-sm">
          <Button
            type="submit"
            icona="delete_forever"
            className="bg-status-annullato text-white shadow-md hover:bg-status-annullato/85"
          >
            Elimina account
          </Button>
        </div>
      </form>

      <ConfirmDialog
        aperta={conferma}
        titolo="Eliminare l’account per sempre?"
        variante="danger"
        icona="delete_forever"
        testoConferma="Sì, elimina"
        inCorso={isLoading}
        onConferma={elimina}
        onAnnulla={() => setConferma(false)}
      >
        I tuoi dati personali vengono cancellati e non potrai più entrare. Non si può tornare indietro.
      </ConfirmDialog>
    </div>
  )
}
