import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Mappa, type MarkerMappa } from '@/components/mappa'
import { Button, CampoPassword, Icon, TextField } from '@/components/ui'
import { CampoCodiceOtp } from '@/features/accesso/CampoCodiceOtp'
import { passwordRicordata } from '@/features/accesso/registrazioneInCorso'
import { useListaEventiQuery } from '@/features/eventi/apiEventi'
import { LIMITI_UTENTI } from '@/types/api'

// Verifica dell'email (FE1-18), rotta /verify?email= (solo per ospiti), come la schermata Stitch
// "NoseY - Verifica Codice OTP & Accesso Mappa" (docs/stitch/verifica-otp.png). Il backend chiede
// email + codice + password: chi verifica deve essere chi si e' registrato (progettazione v4, sezione 1).

/** Centro dell'anteprima della mappa: Roma */
const CENTRO = { lat: 41.8967, lng: 12.4822 }

export default function VerificaEmail() {
  const [parametri] = useSearchParams()
  const emailDaIndirizzo = parametri.get('email') ?? ''
  const [email, setEmail] = useState(emailDaIndirizzo)
  const [codice, setCodice] = useState('')
  // Precompilata solo se la registrazione e' avvenuta in questa scheda (registrazioneInCorso.ts)
  const [password, setPassword] = useState(() => passwordRicordata(emailDaIndirizzo))
  const precompilata = password !== '' && password === passwordRicordata(email)

  const pronto = LIMITI_UTENTI.codice.test(codice) && password !== '' && email.trim() !== ''

  function invia(e: FormEvent) {
    e.preventDefault()
    // Collegamento a POST /api/auth/verify nel passo 6 di FE1-18
  }

  // Anteprima: gli eventi veri sulla mappa, con il cerchio "radar" del design
  const { data: eventi = [] } = useListaEventiQuery()
  const marker: MarkerMappa[] = eventi.map((ev) => ({ id: ev.id, tipo: 'evento', stato: ev.stato, lat: ev.lat, lng: ev.lng, etichetta: ev.titolo }))

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-xs">
        <p className="flex items-center gap-1.5 font-label-code-status text-label-code-status uppercase tracking-wider text-status-in-corso">
          <span className="size-1.5 rounded-full bg-status-in-corso" />
          Fase 2 di 2
        </p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Verifica il tuo account</h1>
        <p className="max-w-xl font-body-md text-body-md text-on-surface-variant">
          Inserisci il codice che ti abbiamo inviato via email: la verifica attiva l'account e ti porta subito alla mappa
          degli eventi, già con l'accesso fatto.
        </p>
      </header>

      <div className="grid items-start gap-space-lg lg:grid-cols-12">
        <section className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-md shadow-xl sm:p-space-lg lg:col-span-7">
          <form onSubmit={invia} noValidate className="flex flex-col gap-space-lg">
            {emailDaIndirizzo ? (
              <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-md">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                  <Icon nome="alternate_email" size={20} />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="font-label-code-status text-label-code-status uppercase text-outline">Codice inviato a</span>
                  <span className="truncate font-label-btn text-label-btn text-on-surface">{email}</span>
                </div>
              </div>
            ) : (
              <TextField
                etichetta="Email usata per la registrazione"
                type="email"
                icona="mail"
                autoComplete="email"
                obbligatorio
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="utente@dominio.it"
              />
            )}

            <CampoCodiceOtp valore={codice} onChange={setCodice} autoFocus />

            <CampoPassword
              etichetta="Password dell'account"
              obbligatorio
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aiuto={precompilata ? 'Precompilata con quella scelta alla registrazione.' : 'La stessa scelta alla registrazione.'}
            />

            <Button type="submit" variant="gradient" size="lg" pieno icona="how_to_reg" disabled={!pronto}>
              Verifica il codice e accedi
            </Button>
          </form>
        </section>

        <aside className="flex flex-col gap-space-md rounded-2xl bg-surface-glass p-space-md shadow-xl backdrop-blur-xl sm:p-space-lg lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 font-headline-sm text-headline-sm">
              <Icon nome="radar" size={22} className="text-secondary" />
              Cosa ti aspetta
            </span>
            <span className="rounded bg-surface-container-high px-2 py-0.5 font-label-code-status text-label-code-status text-secondary">
              ANTEPRIMA
            </span>
          </div>
          <Mappa
            etichetta="Anteprima della mappa degli eventi"
            centro={CENTRO}
            zoom={11}
            marker={marker}
            cerchio={{ centro: CENTRO, raggioKm: 2 }}
            className="h-56"
          />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Dopo la verifica trovi la mappa con gli eventi in programma e in corso: condividi la posizione per vederli dal
            più vicino.
          </p>
        </aside>
      </div>
    </div>
  )
}
