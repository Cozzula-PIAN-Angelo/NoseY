import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button, CampoPassword, DateTimeField, TextField } from '@/components/ui'
import { cx } from '@/lib/cx'
import { LIMITI_UTENTI } from '@/types/api'
import { robustezzaPassword } from './robustezzaPassword'

// Form di registrazione (FE1-18) come la schermata Stitch "Registrazione Account":
// nome e cognome, email, password con robustezza e limite in byte, conferma, data di nascita,
// indirizzo facoltativo, accettazione dei termini.

export type ValoriRegistrazione = {
  nome: string
  cognome: string
  email: string
  password: string
  conferma: string
  dataNascita: string
  indirizzo: string
  termini: boolean
}

export const REGISTRAZIONE_VUOTA: ValoriRegistrazione = {
  nome: '',
  cognome: '',
  email: '',
  password: '',
  conferma: '',
  dataNascita: '',
  indirizzo: '',
  termini: false,
}

const COLORI_ROBUSTEZZA = ['', 'bg-status-annullato', 'bg-accent-gold-piercing', 'bg-secondary', 'bg-status-in-corso']

type FormRegistrazioneProps = {
  inCorso?: boolean
  onInvia: (valori: ValoriRegistrazione) => void
}

export function FormRegistrazione({ inCorso = false, onInvia }: FormRegistrazioneProps) {
  const [v, setV] = useState<ValoriRegistrazione>(REGISTRAZIONE_VUOTA)
  const cambia = <K extends keyof ValoriRegistrazione>(campo: K, valore: ValoriRegistrazione[K]) =>
    setV((attuali) => ({ ...attuali, [campo]: valore }))
  const robustezza = robustezzaPassword(v.password)

  function invia(e: FormEvent) {
    e.preventDefault()
    onInvia(v)
  }

  return (
    <form onSubmit={invia} noValidate className="flex flex-col gap-space-md">
      <div className="grid gap-space-md sm:grid-cols-2">
        <TextField
          etichetta="Nome"
          obbligatorio
          autoComplete="given-name"
          maxLength={LIMITI_UTENTI.nome}
          contatore
          value={v.nome}
          onChange={(e) => cambia('nome', e.target.value)}
          placeholder="es. Valerio"
        />
        <TextField
          etichetta="Cognome"
          obbligatorio
          autoComplete="family-name"
          maxLength={LIMITI_UTENTI.cognome}
          contatore
          value={v.cognome}
          onChange={(e) => cambia('cognome', e.target.value)}
          placeholder="es. Rossi"
        />
      </div>

      <TextField
        etichetta="Indirizzo email"
        obbligatorio
        type="email"
        autoComplete="email"
        icona="mail"
        maxLength={LIMITI_UTENTI.email}
        value={v.email}
        onChange={(e) => cambia('email', e.target.value)}
        placeholder="utente@dominio.it"
        aiuto="Ti invieremo qui il codice di verifica a 6 cifre."
      />

      <div className="flex flex-col gap-space-xs">
        <CampoPassword
          etichetta="Password"
          obbligatorio
          autoComplete="new-password"
          contaByte={LIMITI_UTENTI.passwordMaxByte}
          value={v.password}
          onChange={(e) => cambia('password', e.target.value)}
          placeholder="Almeno 8 caratteri"
        />
        {/* Robustezza: 4 barrette come nel design */}
        <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={cx('h-1 rounded transition-colors', n <= robustezza.livello ? COLORI_ROBUSTEZZA[robustezza.livello] : 'bg-surface-container')}
            />
          ))}
        </div>
        <p aria-live="polite" className="font-body-sm text-body-sm text-outline">
          {robustezza.testo}
        </p>
      </div>

      <CampoPassword
        etichetta="Conferma password"
        obbligatorio
        autoComplete="new-password"
        value={v.conferma}
        onChange={(e) => cambia('conferma', e.target.value)}
        placeholder="Riscrivi la password"
      />

      <div className="grid gap-space-md sm:grid-cols-12">
        <DateTimeField
          className="sm:col-span-5"
          etichetta="Data di nascita"
          obbligatorio
          soloData
          max={new Date()}
          autoComplete="bday"
          value={v.dataNascita}
          onChange={(e) => cambia('dataNascita', e.target.value)}
        />
        <TextField
          className="sm:col-span-7"
          etichetta="Indirizzo (facoltativo)"
          icona="location_on"
          autoComplete="street-address"
          maxLength={LIMITI_UTENTI.indirizzo}
          contatore
          value={v.indirizzo}
          onChange={(e) => cambia('indirizzo', e.target.value)}
          placeholder="es. Via Tortona 14, Milano"
        />
      </div>

      <label className="flex cursor-pointer select-none items-start gap-space-sm pt-space-sm">
        <input
          type="checkbox"
          checked={v.termini}
          onChange={(e) => cambia('termini', e.target.checked)}
          className="mt-1 size-4 shrink-0 cursor-pointer rounded accent-primary-container"
        />
        <span className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
          Dichiaro di aver letto e di accettare i <span className="font-semibold text-primary">Termini di servizio</span> e
          l'<span className="font-semibold text-primary">Informativa sulla privacy</span>.
        </span>
      </label>

      <div className="flex flex-col gap-space-sm pt-space-md">
        <Button type="submit" variant="gradient" size="lg" pieno iconaDopo="arrow_forward" inCorso={inCorso}>
          Crea account e ricevi il codice
        </Button>
        <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
          Hai già un account verificato?{' '}
          <Link to="/login" className="font-semibold text-primary transition-colors hover:text-primary-fixed">
            Accedi
          </Link>
        </p>
      </div>
    </form>
  )
}
