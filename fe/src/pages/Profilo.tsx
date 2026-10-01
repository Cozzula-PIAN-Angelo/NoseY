import type { ReactNode } from 'react'
import { Caricamento, Icon, MessaggioErrore } from '@/components/ui'
import { FormCambioPassword } from '@/features/profilo/FormCambioPassword'
import { FormDatiPersonali } from '@/features/profilo/FormDatiPersonali'
import { ImmagineProfilo } from '@/features/profilo/ImmagineProfilo'
import { useVediProfiloQuery } from '@/features/utenti/apiUtenti'
import type { Ruolo, UtenteResponse } from '@/types/api'

// Profilo (FE2-07), rotta /profile (solo con login): immagine del profilo (FE2-08, nel riepilogo),
// dati personali (ModificaProfilo) e cambio password (CambioPassword). I dati arrivano da VediProfilo, cioe' dal server e non dalla copia
// della sessione, che VediProfilo intanto aggiorna (apiUtenti).
// Non c'e' una schermata Stitch dedicata: la pagina segue "NoseY - Registrazione Account"
// (docs/stitch/registrazione-account.png): pannello a sinistra, card dei form a destra con la
// barra sfumata, stessi campi. L'eliminazione dell'account va aggiunta qui dalla sua card.

const NOME_RUOLO: Record<Ruolo, string> = { USER: 'Utente', ADMIN: 'Admin', SUPERADMIN: 'Superadmin' }

const SICUREZZA = [
  { icona: 'password', titolo: 'Password', testo: 'Almeno 8 caratteri, al massimo 72 byte.' },
  { icona: 'devices', titolo: 'Altri dispositivi', testo: 'Cambiando password escono, questo resta collegato.' },
]

export default function Profilo() {
  const { data: utente, isLoading, error, refetch } = useVediProfiloQuery()

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-xs">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Il tuo profilo</h1>
        <p className="max-w-xl font-body-md text-body-md text-on-surface-variant">
          Aggiorna immagine del profilo, dati personali e password dell’account.
        </p>
      </header>

      {isLoading ? (
        <Caricamento riquadro testo="Carico il profilo..." />
      ) : !utente ? (
        <MessaggioErrore errore={error} onRiprova={refetch} />
      ) : (
        <div className="grid items-start gap-space-lg lg:grid-cols-12">
          <aside className="flex flex-col gap-space-md lg:sticky lg:top-24 lg:col-span-5">
            <Riepilogo utente={utente} />
            <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md shadow-md">
              <span className="font-label-code-status text-label-code-status uppercase tracking-wider text-outline">
                Sicurezza dell’account
              </span>
              <div className="grid gap-space-sm sm:grid-cols-2">
                {SICUREZZA.map((s) => (
                  <div key={s.titolo} className="flex flex-col gap-1 rounded bg-surface-container-high p-space-sm">
                    <span className="flex items-center gap-1.5 font-label-btn text-label-btn text-on-surface">
                      <Icon nome={s.icona} size={18} className="text-secondary" />
                      {s.titolo}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{s.testo}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex flex-col gap-space-lg lg:col-span-7">
            <Sezione titolo="Dati personali" testo="Nome, cognome, data di nascita e indirizzo. Si salvano solo i campi che cambi." barra>
              {/* key: se il profilo salvato cambia (es. da un'altra scheda) il form riparte da li' */}
              <FormDatiPersonali
                key={[utente.nome, utente.cognome, utente.dataNascita, utente.indirizzo].join('|')}
                utente={utente}
              />
            </Sezione>
            <Sezione titolo="Cambia password" testo="Serve la password attuale. Ti mandiamo un’email quando la cambi.">
              <FormCambioPassword email={utente.email} />
            </Sezione>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Riepilogo dell'account

function Riepilogo({ utente }: { utente: UtenteResponse }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-inverse-primary/50 via-surface-card to-surface-deep p-space-lg shadow-xl">
      <div className="flex flex-col gap-space-md">
        <span className="flex w-max items-center gap-space-xs rounded-full bg-surface-glass px-space-sm py-1 backdrop-blur-md">
          <Icon nome="account_circle" size={16} className="text-accent-gold-piercing" />
          <span className="font-label-code-status text-label-code-status uppercase tracking-wider text-accent-gold-piercing">
            Il tuo account
          </span>
        </span>

        <ImmagineProfilo utente={utente}>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate font-headline-md text-headline-md text-on-surface">
              {utente.nome} {utente.cognome}
            </p>
            <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
              <Icon nome="mail" size={16} className="shrink-0" />
              <span className="truncate">{utente.email}</span>
            </p>
            <span className="mt-1 flex w-max items-center gap-1 rounded bg-surface-container px-space-sm py-1 font-label-code-status text-label-code-status uppercase text-secondary">
              {utente.ruolo !== 'USER' && <Icon nome="verified" size={14} />}
              {NOME_RUOLO[utente.ruolo]}
            </span>
          </div>
        </ImmagineProfilo>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Card di una sezione

type SezioneProps = {
  titolo: string
  testo: string
  /** Barra sfumata in alto, come la card del form su Stitch: solo sulla prima */
  barra?: boolean
  children: ReactNode
}

function Sezione({ titolo, testo, barra = false, children }: SezioneProps) {
  return (
    <section className="relative flex flex-col gap-space-lg overflow-hidden rounded-xl bg-surface-card p-space-md shadow-xl sm:p-space-lg">
      {barra && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-container via-primary to-secondary" />
      )}
      <header className="flex flex-col gap-1">
        <h2 className="font-headline-md text-headline-md">{titolo}</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">{testo}</p>
      </header>
      {children}
    </section>
  )
}
