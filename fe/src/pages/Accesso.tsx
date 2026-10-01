import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, CampoPassword, Icon, MessaggioErrore, TextField, useAvviso } from '@/components/ui'
import { ricordaPassword } from '@/features/accesso/registrazioneInCorso'
import { useLoginMutation } from '@/features/utenti/apiUtenti'
import { leggiErrore, type ErroreLeggibile } from '@/lib/errori'
import { LIMITI_UTENTI } from '@/types/api'

// Accesso (FE2-05), rotta /login (solo per ospiti). Il login non ha una schermata Stitch: la pagina
// riprende "NoseY - Registrazione Account" (docs/stitch/registrazione-account.png), come la
// registrazione: pannello di benvenuto a sinistra, form con la barra sfumata a destra.
// Dopo il login apiUtenti salva la sessione e SoloOspiti porta al ?redirect= (o alla home).
// Con ?email= (dopo il reset della password, FE2-06) l'email e' gia' scritta e si parte dalla password.

const COSA_TROVI = [
  { icona: 'qr_code_2', titolo: 'I tuoi ticket', testo: 'Il codice QR di ogni evento a cui ti sei iscritto, pronto all’ingresso.' },
  { icona: 'forum', titolo: 'Amici e chat', testo: 'Le richieste di amicizia e le conversazioni con chi hai conosciuto.' },
  { icona: 'notifications', titolo: 'Notifiche', testo: 'Modifiche agli eventi, nuove richieste e messaggi mentre eri via.' },
]

// Formato semplice (qualcosa@qualcosa.dominio): il controllo vero lo fa il backend
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Errori = { email?: string; password?: string }

export default function Accesso() {
  const [login, { isLoading }] = useLoginMutation()
  const avviso = useAvviso()
  const navigate = useNavigate()
  const [parametri] = useSearchParams()
  const emailIniziale = parametri.get('email') ?? ''
  const [email, setEmail] = useState(emailIniziale)
  const [password, setPassword] = useState('')
  const [errori, setErrori] = useState<Errori>({})
  // Errore che non riguarda un campo (credenziali, account sospeso, troppi tentativi): sopra il pulsante
  const [erroreAccesso, setErroreAccesso] = useState<ErroreLeggibile | null>(null)

  // Registrazione e verifica tengono il ?redirect=: dopo si torna comunque alla pagina di partenza
  const redirect = parametri.get('redirect')
  const conRedirect = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''

  async function invia(e: FormEvent) {
    e.preventDefault()
    const trovati: Errori = {}
    if (!email.trim()) trovati.email = 'Inserisci l’email.'
    else if (!EMAIL.test(email.trim())) trovati.email = 'Email non valida.'
    if (!password) trovati.password = 'Inserisci la password.'
    setErrori(trovati)
    setErroreAccesso(null)
    if (Object.keys(trovati).length) return

    try {
      const { utente } = await login({ email: email.trim(), password }).unwrap()
      avviso.successo(`Bentornato, ${utente.nome}!`, 'Hai effettuato l’accesso.')
    } catch (err) {
      const errore = leggiErrore(err)
      switch (errore.codice) {
        case 'CREDENZIALI_ERRATE':
        case 'ACCOUNT_SOSPESO':
          setErroreAccesso(errore)
          break
        case 'TROPPE_RICHIESTE':
          // Sul login: 10 tentativi falliti in 15 minuti per la stessa email
          setErroreAccesso({ ...errore, messaggio: 'Troppi tentativi falliti con questa email: riprova tra un quarto d’ora.' })
          break
        case 'EMAIL_NON_VERIFICATA': {
          // La password e' giusta (il 403 arriva solo dopo): la verifica la trova gia' compilata
          ricordaPassword(email, password)
          avviso.info('Verifica la tua email', 'Inserisci il codice che ti abbiamo inviato. Se è scaduto, chiedine uno nuovo.')
          const dati = new URLSearchParams({ email: email.trim() })
          if (redirect) dati.set('redirect', redirect)
          navigate(`/verify?${dati}`)
          break
        }
        case 'VALIDAZIONE':
          setErrori({ email: errore.campi.email, password: errore.campi.password })
          break
        default:
          avviso.erroreApi(err)
      }
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1440px] items-start gap-space-lg px-margin-mobile py-space-xl md:px-margin lg:grid-cols-12">
      {/* Pannello a sinistra (su telefono va sotto il form) */}
      <aside className="order-2 flex flex-col gap-space-md lg:order-1 lg:col-span-5">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-inverse-primary/50 via-surface-card to-surface-deep p-space-lg shadow-xl">
          <div className="relative flex flex-col gap-space-md">
            <span className="flex w-max items-center gap-space-xs rounded-full bg-surface-glass px-space-sm py-1 backdrop-blur-md">
              <Icon nome="auto_awesome" size={16} className="text-accent-gold-piercing" />
              <span className="font-label-code-status text-label-code-status uppercase tracking-wider text-accent-gold-piercing">
                Bentornato su NoseY
              </span>
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">
                La notte ti stava aspettando
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Accedi per ritrovare i tuoi eventi, i ticket e le persone conosciute.
              </p>
            </div>
            <ul className="flex flex-col gap-space-sm pt-space-xs">
              {COSA_TROVI.map((f) => (
                <li key={f.titolo} className="flex items-start gap-space-sm rounded-lg bg-surface-container-low/90 p-space-sm shadow-sm backdrop-blur-md">
                  <span className="flex shrink-0 items-center justify-center rounded bg-primary/10 p-2 text-primary">
                    <Icon nome={f.icona} size={20} />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm">{f.titolo}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{f.testo}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Form */}
      <section className="order-1 lg:order-2 lg:col-span-7">
        <div className="relative flex flex-col gap-space-lg overflow-hidden rounded-xl bg-surface-card p-space-md shadow-xl sm:p-space-lg">
          {/* Barra sfumata in alto, come nel design */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-container via-primary to-secondary" />
          <header className="flex flex-col gap-1">
            <h2 className="font-headline-md text-headline-md">Accedi</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Entra con l’email e la password scelte alla registrazione.
            </p>
          </header>

          <form onSubmit={invia} noValidate className="flex flex-col gap-space-lg">
            <TextField
              etichetta="Indirizzo email"
              obbligatorio
              type="email"
              autoComplete="email"
              icona="mail"
              maxLength={LIMITI_UTENTI.email}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrori((er) => ({ ...er, email: undefined }))
              }}
              errore={errori.email}
              placeholder="utente@dominio.it"
              autoFocus={!emailIniziale}
            />

            <div className="flex flex-col gap-space-xs">
              <CampoPassword
                etichetta="Password"
                obbligatorio
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrori((er) => ({ ...er, password: undefined }))
                }}
                errore={errori.password}
                autoFocus={!!emailIniziale}
              />
              <Link
                to={`/forgot-password${conRedirect}`}
                className="self-end font-body-sm text-body-sm text-primary transition-colors hover:text-primary-fixed"
              >
                Password dimenticata?
              </Link>
            </div>

            {erroreAccesso && <MessaggioErrore errore={erroreAccesso} />}

            <Button type="submit" variant="gradient" size="lg" pieno icona="login" inCorso={isLoading}>
              Accedi
            </Button>
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
              Non hai ancora un account?{' '}
              <Link to={`/register${conRedirect}`} className="font-semibold text-primary transition-colors hover:text-primary-fixed">
                Registrati
              </Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  )
}
