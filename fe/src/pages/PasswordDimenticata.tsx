import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, CampoPassword, Icon, MessaggioErrore, TextField, useAvviso } from '@/components/ui'
import { CampoCodiceOtp } from '@/features/accesso/CampoCodiceOtp'
import { segnaInvioCodice } from '@/features/accesso/registrazioneInCorso'
import { ReinvioCodice } from '@/features/accesso/ReinvioCodice'
import { BarreRobustezza } from '@/features/accesso/BarreRobustezza'
import { usePasswordDimenticataMutation, useReimpostaPasswordMutation } from '@/features/utenti/apiUtenti'
import { leggiErrore, type ErroreLeggibile } from '@/lib/errori'
import { bytePassword, LIMITI_UTENTI } from '@/types/api'

// Password dimenticata (FE2-06), rotta /forgot-password (solo per ospiti), in due fasi:
// 1. email → PasswordDimenticata, che manda il codice; 2. codice + nuova password → ReimpostaPassword.
// Non c'e' una schermata Stitch dedicata: la pagina segue "NoseY - Verifica Codice OTP & Accesso Mappa"
// (docs/stitch/verifica-otp.png) e per la nuova password le barrette di "Registrazione Account".
// L'email della fase 2 sta nell'indirizzo (?email=), come in /verify: ricaricando si resta li'.
// Il reset non fa il login (progettazione v4, sezione 1): alla fine si va al login con l'email pronta.

// Formato semplice (qualcosa@qualcosa.dominio): il controllo vero lo fa il backend
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DOPO_IL_RESET = [
  { icona: 'devices', titolo: 'Esci da tutti i dispositivi', testo: 'Le sessioni aperte con la vecchia password vengono chiuse.' },
  { icona: 'mark_email_read', titolo: 'Ti avvisiamo via email', testo: 'Ricevi un messaggio che conferma il cambio della password.' },
  { icona: 'login', titolo: 'Accedi di nuovo', testo: 'Entra con la stessa email e la password appena scelta.' },
]

export default function PasswordDimenticata() {
  const [parametri, setParametri] = useSearchParams()
  const emailInviata = parametri.get('email') ?? ''
  const redirect = parametri.get('redirect')
  const fase = emailInviata ? 2 : 1

  /** Cambia fase: con l'email si va al codice, senza si torna all'email (il ?redirect= resta) */
  function vaiAllaFase(email: string) {
    setParametri((p) => {
      if (email) p.set('email', email)
      else p.delete('email')
      return p
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-xs">
        <p className="flex items-center gap-1.5 font-label-code-status text-label-code-status uppercase tracking-wider text-status-in-corso">
          <span className="size-1.5 rounded-full bg-status-in-corso" />
          Fase {fase} di 2
        </p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">
          {fase === 1 ? 'Password dimenticata' : 'Scegli la nuova password'}
        </h1>
        <p className="max-w-xl font-body-md text-body-md text-on-surface-variant">
          {fase === 1
            ? 'Scrivi l’email del tuo account: ti mandiamo un codice a 6 cifre per sceglierne una nuova.'
            : 'Inserisci il codice che ti abbiamo inviato via email e la password che vuoi usare d’ora in poi.'}
        </p>
      </header>

      <div className="grid items-start gap-space-lg lg:grid-cols-12">
        <section className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-md shadow-xl sm:p-space-lg lg:col-span-7">
          {fase === 1 ? (
            <FaseEmail redirect={redirect} onCodiceInviato={vaiAllaFase} />
          ) : (
            // key: cambiando email il form riparte vuoto
            <FaseNuovaPassword key={emailInviata.toLowerCase()} email={emailInviata} redirect={redirect} onCambiaEmail={() => vaiAllaFase('')} />
          )}
        </section>

        <aside className="flex flex-col gap-space-md rounded-2xl bg-surface-glass p-space-md shadow-xl backdrop-blur-xl sm:p-space-lg lg:col-span-5">
          <span className="flex items-center gap-2.5 font-headline-sm text-headline-sm">
            <Icon nome="shield_lock" size={22} className="text-secondary" />
            Cosa succede dopo
          </span>
          <ul className="flex flex-col gap-space-sm">
            {DOPO_IL_RESET.map((p) => (
              <li key={p.titolo} className="flex items-start gap-space-sm rounded-lg bg-surface-container-low/90 p-space-sm">
                <span className="flex shrink-0 items-center justify-center rounded bg-primary/10 p-2 text-primary">
                  <Icon nome={p.icona} size={20} />
                </span>
                <span className="flex flex-col">
                  <span className="font-label-btn text-label-btn text-on-surface">{p.titolo}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{p.testo}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-outline">
            <Icon nome="info" size={16} className="mt-0.5" />
            Il codice vale 15 minuti e si può sbagliare al massimo 5 volte. L’account deve avere l’email già verificata.
          </p>
        </aside>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Fase 1: email

type FaseEmailProps = {
  redirect: string | null
  onCodiceInviato: (email: string) => void
}

function FaseEmail({ redirect, onCodiceInviato }: FaseEmailProps) {
  const [passwordDimenticata, { isLoading }] = usePasswordDimenticataMutation()
  const avviso = useAvviso()
  const [email, setEmail] = useState('')
  const [errore, setErrore] = useState<string>()
  const [erroreInvio, setErroreInvio] = useState<ErroreLeggibile | null>(null)

  /** Errore del campo email, o undefined se va bene */
  function controllaEmail(): string | undefined {
    if (!email.trim()) return 'Inserisci l’email.'
    if (!EMAIL.test(email.trim())) return 'Email non valida.'
    if (email.trim().length > LIMITI_UTENTI.email) return `Al massimo ${LIMITI_UTENTI.email} caratteri.`
  }

  async function invia(e: FormEvent) {
    e.preventDefault()
    const trovato = controllaEmail()
    setErrore(trovato)
    setErroreInvio(null)
    if (trovato) return

    try {
      await passwordDimenticata({ email: email.trim() }).unwrap()
      // Il backend risponde 204 anche per email sconosciute: non si dice se l'account esiste
      segnaInvioCodice(email)
      avviso.info('Controlla la tua email', `Se ${email.trim()} è registrata e verificata, il codice arriva tra poco.`)
      onCodiceInviato(email.trim())
    } catch (err) {
      const letto = leggiErrore(err)
      switch (letto.codice) {
        case 'TROPPE_RICHIESTE':
          // Un invio al minuto e 5 al giorno per account: forse un codice e' gia' arrivato
          setErroreInvio({
            ...letto,
            messaggio: 'Hai già chiesto un codice da poco: controlla l’email, oppure riprova tra un minuto (al massimo 5 codici al giorno).',
          })
          break
        case 'VALIDAZIONE':
          setErrore(letto.campi.email ?? 'Email non valida.')
          break
        default:
          avviso.erroreApi(err)
      }
    }
  }

  /** "Ho gia' un codice": si passa alla fase 2 senza chiederne un altro */
  function hoGiaUnCodice() {
    const trovato = controllaEmail()
    setErrore(trovato)
    if (!trovato) onCodiceInviato(email.trim())
  }

  return (
    <form onSubmit={invia} noValidate className="flex flex-col gap-space-lg">
      <TextField
        etichetta="Email dell’account"
        obbligatorio
        type="email"
        autoComplete="email"
        icona="mail"
        maxLength={LIMITI_UTENTI.email}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setErrore(undefined)
        }}
        errore={errore}
        placeholder="utente@dominio.it"
        aiuto="La stessa usata per accedere."
        autoFocus
      />

      {erroreInvio && <MessaggioErrore errore={erroreInvio} />}

      <Button type="submit" variant="gradient" size="lg" pieno icona="forward_to_inbox" inCorso={isLoading}>
        Inviami il codice
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-space-sm font-body-sm text-body-sm">
        <Link to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} className="flex items-center gap-1 text-on-surface-variant transition-colors hover:text-on-surface">
          <Icon nome="arrow_back" size={16} />
          Torna all’accesso
        </Link>
        <button type="button" onClick={hoGiaUnCodice} className="font-semibold text-primary transition-colors hover:text-primary-fixed">
          Ho già un codice
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------- Fase 2: codice e nuova password

type ErroriReset = { codice?: string; password?: string; conferma?: string }

type FaseNuovaPasswordProps = {
  email: string
  redirect: string | null
  onCambiaEmail: () => void
}

function FaseNuovaPassword({ email, redirect, onCambiaEmail }: FaseNuovaPasswordProps) {
  const [reimposta, { isLoading }] = useReimpostaPasswordMutation()
  const avviso = useAvviso()
  const navigate = useNavigate()
  const [codice, setCodice] = useState('')
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [errori, setErrori] = useState<ErroriReset>({})

  function controlla(): ErroriReset {
    const trovati: ErroriReset = {}
    if (!LIMITI_UTENTI.codice.test(codice)) trovati.codice = 'Inserisci le 6 cifre del codice.'
    if (!password) trovati.password = 'Scegli la nuova password.'
    else if (password.length < LIMITI_UTENTI.passwordMin) trovati.password = `Almeno ${LIMITI_UTENTI.passwordMin} caratteri.`
    else if (bytePassword(password) > LIMITI_UTENTI.passwordMaxByte)
      trovati.password = `Troppo lunga: al massimo ${LIMITI_UTENTI.passwordMaxByte} byte (lettere accentate ed emoji valgono di più).`
    if (!conferma) trovati.conferma = 'Riscrivi la password per conferma.'
    else if (conferma !== password) trovati.conferma = 'Le due password non coincidono.'
    return trovati
  }

  async function invia(e: FormEvent) {
    e.preventDefault()
    const trovati = controlla()
    setErrori(trovati)
    if (Object.keys(trovati).length) return

    try {
      await reimposta({ email, codice, nuovaPassword: password }).unwrap()
      avviso.successo('Password aggiornata', 'Accedi con la nuova password: per sicurezza sei uscito da tutti i dispositivi.')
      // Al login con l'email gia' scritta (e il ?redirect= di partenza, se c'era)
      const dati = new URLSearchParams({ email })
      if (redirect) dati.set('redirect', redirect)
      navigate(`/login?${dati}`, { replace: true })
    } catch (err) {
      const letto = leggiErrore(err)
      switch (letto.codice) {
        case 'CODICE_NON_VALIDO':
          // Anche per un account inesistente o non verificato: il backend non dice quale dei due
          setErrori({ codice: 'Codice non corretto: controlla l’email e riprova.' })
          setCodice('')
          break
        case 'CODICE_SCADUTO':
          setErrori({ codice: 'Il codice è scaduto o hai fatto troppi tentativi: richiedine uno nuovo qui sotto.' })
          setCodice('')
          break
        case 'VALIDAZIONE':
          setErrori({ codice: letto.campi.codice, password: letto.campi.nuovaPassword })
          break
        default:
          avviso.erroreApi(err)
      }
    }
  }

  return (
    <>
      <form onSubmit={invia} noValidate className="flex flex-col gap-space-lg">
        <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-md">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
            <Icon nome="alternate_email" size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-label-code-status text-label-code-status uppercase text-outline">Codice inviato a</span>
            <span className="truncate font-label-btn text-label-btn text-on-surface">{email}</span>
          </div>
          <button
            type="button"
            onClick={onCambiaEmail}
            className="shrink-0 font-body-sm text-body-sm font-semibold text-primary transition-colors hover:text-primary-fixed"
          >
            Cambia
          </button>
        </div>

        <CampoCodiceOtp
          etichetta="Codice ricevuto via email"
          valore={codice}
          onChange={(c) => {
            setCodice(c)
            setErrori((er) => ({ ...er, codice: undefined }))
          }}
          errore={errori.codice}
          disabled={isLoading}
          autoFocus
        />

        <div className="flex flex-col gap-space-xs">
          <CampoPassword
            etichetta="Nuova password"
            obbligatorio
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrori((er) => ({ ...er, password: undefined, conferma: undefined }))
            }}
            errore={errori.password}
            placeholder="Almeno 8 caratteri"
          />
          <BarreRobustezza password={password} />
        </div>

        <CampoPassword
          etichetta="Conferma la nuova password"
          obbligatorio
          autoComplete="new-password"
          value={conferma}
          onChange={(e) => {
            setConferma(e.target.value)
            setErrori((er) => ({ ...er, conferma: undefined }))
          }}
          errore={errori.conferma}
          placeholder="Riscrivi la password"
        />

        <Button type="submit" variant="gradient" size="lg" pieno icona="lock_reset" inCorso={isLoading}>
          Reimposta la password
        </Button>
      </form>
      <ReinvioCodice email={email} scopo="reset" />
    </>
  )
}
