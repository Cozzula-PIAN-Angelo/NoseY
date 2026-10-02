import { Icon } from '@/components/ui'

// Eliminazione dell'account dal profilo (FE2-14) → Anonimizzazione (POST /api/users/me/anonymize).
// Prima di tutto un avviso chiaro: l'operazione e' irreversibile. L'elenco riassume gli effetti
// descritti nella progettazione v4 (sezione 2, "Anonimizzazione"), con parole da utente.
// Stessi colori degli errori (status-annullato), come MessaggioErrore e ConfirmDialog "danger".

const EFFETTI = [
  { icona: 'person_off', testo: 'Nome, email, indirizzo, data di nascita e immagine del profilo vengono cancellati.' },
  { icona: 'lock', testo: 'Non potrai più entrare con questo account, nemmeno reimpostando la password.' },
  { icona: 'event_busy', testo: 'I tuoi eventi in programma vengono annullati e chi partecipa riceve un avviso.' },
  { icona: 'confirmation_number', testo: 'Le iscrizioni agli eventi futuri vengono cancellate. I ticket degli eventi passati restano.' },
  { icona: 'group', testo: 'Le richieste di amicizia in attesa vengono ritirate. Per i tuoi amici diventi «Utente anonimo».' },
  { icona: 'forum', testo: 'I messaggi che hai scritto restano, firmati «Utente anonimo». Le tue notifiche vengono cancellate.' },
]

export function EliminaAccount() {
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
    </div>
  )
}
