import { Icon } from '@/components/ui'
import { FormRegistrazione, type ValoriRegistrazione } from '@/features/accesso/FormRegistrazione'

// Registrazione (FE1-18), rotta /register (solo per ospiti), come la schermata Stitch
// "NoseY - Registrazione Account" (docs/stitch/registrazione-account.png): a sinistra cosa offre
// NoseY, a destra il form (fase 1 di 2: dopo c'e' la verifica del codice).

const FUNZIONI = [
  { icona: 'radar', titolo: 'Eventi vicino a te', testo: 'La mappa degli eventi in programma, ordinati dal più vicino.' },
  { icona: 'qr_code_2', titolo: 'Ticket con QR', testo: 'Ti iscrivi in un clic e mostri il codice all’ingresso.' },
  { icona: 'forum', titolo: 'Amici e chat', testo: 'Conosci chi partecipa ai tuoi stessi eventi e scrivigli.' },
]

export default function Registrazione() {
  function invia(_valori: ValoriRegistrazione) {
    // Collegamento a POST /api/auth/register nel passo 4 di FE1-18
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
                Benvenuto su NoseY
              </span>
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">
                Accedi all'epicentro della notte
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Eventi dal vivo, club e festival vicino a te, in un'unica app.
              </p>
            </div>
            <ul className="flex flex-col gap-space-sm pt-space-xs">
              {FUNZIONI.map((f) => (
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
            <div className="flex items-center justify-between gap-space-sm">
              <h2 className="font-headline-md text-headline-md">Crea il tuo account</h2>
              <span className="shrink-0 rounded bg-surface-container px-space-sm py-1 font-label-code-status text-label-code-status text-secondary">
                FASE 1 DI 2
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Completa i dati richiesti: ti invieremo un codice di verifica a 6 cifre via email.
            </p>
          </header>
          <FormRegistrazione onInvia={invia} />
        </div>
      </section>
    </div>
  )
}
