import { useState } from 'react'
import { Caricamento, Icon, MessaggioErrore, Paginazione, Select, StatoVuoto, TextField, type Opzione } from '@/components/ui'
import { useListaUtentiQuery } from '@/features/admin/apiAdmin'
import { useValoreRitardato } from '@/hooks/useValoreRitardato'
import { cx } from '@/lib/cx'
import { giorno } from '@/lib/formato'
import type { AdminUtenteResponse, Ruolo, StatoUtente } from '@/types/api'

// Pannello admin: utenti e ruoli (FE1-15), rotta /admin/users (solo ADMIN e SUPERADMIN).
// Passo 1: tabella con ricerca (email, nome, cognome), filtro per stato e paginazione.

const OPZIONI_STATO: Opzione<StatoUtente | ''>[] = [
  { valore: '', etichetta: 'Tutti gli stati' },
  { valore: 'ATTIVO', etichetta: 'Attivi' },
  { valore: 'SOSPESO', etichetta: 'Sospesi' },
  { valore: 'ANONIMIZZATO', etichetta: 'Anonimizzati' },
]

const RUOLI: Record<Ruolo, { etichetta: string; classi: string }> = {
  USER: { etichetta: 'Utente', classi: 'bg-surface-container-high text-on-surface-variant' },
  ADMIN: { etichetta: 'Admin', classi: 'bg-secondary/15 text-secondary' },
  SUPERADMIN: { etichetta: 'Superadmin', classi: 'bg-accent-gold-piercing/15 text-accent-gold-piercing' },
}

const STATI: Record<StatoUtente, { etichetta: string; colore: string }> = {
  ATTIVO: { etichetta: 'Attivo', colore: 'bg-status-in-corso' },
  SOSPESO: { etichetta: 'Sospeso', colore: 'bg-tertiary' },
  ANONIMIZZATO: { etichetta: 'Anonimizzato', colore: 'bg-status-concluso' },
}

function RigaUtente({ utente }: { utente: AdminUtenteResponse }) {
  const ruolo = RUOLI[utente.ruolo]
  const stato = STATI[utente.stato]
  return (
    <tr className="border-t border-outline-variant/30">
      <td className="px-space-sm py-space-sm">
        <div className="flex flex-col">
          <span className="font-label-btn text-label-btn text-on-surface">
            {utente.nome} {utente.cognome}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{utente.email}</span>
        </div>
      </td>
      <td className="px-space-sm py-space-sm">
        <span className={cx('rounded px-2 py-0.5 font-label-code-status text-label-code-status uppercase', ruolo.classi)}>
          {ruolo.etichetta}
        </span>
      </td>
      <td className="px-space-sm py-space-sm">
        <span className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface">
          <span aria-hidden="true" className={cx('size-2 rounded-full', stato.colore)} />
          {stato.etichetta}
        </span>
      </td>
      <td className="px-space-sm py-space-sm">
        {utente.verificato ? (
          <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
            <Icon nome="verified" size={16} className="text-status-in-corso" />
            Verificata
          </span>
        ) : (
          <span className="font-body-sm text-body-sm text-outline">Da verificare</span>
        )}
      </td>
      <td className="whitespace-nowrap px-space-sm py-space-sm font-body-sm text-body-sm text-on-surface-variant">
        {giorno(utente.creatoIl)}
      </td>
    </tr>
  )
}

export default function AdminUtenti() {
  const [testo, setTesto] = useState('')
  const [stato, setStato] = useState<StatoUtente | ''>('')
  const cerca = useValoreRitardato(testo.trim(), 300)
  // La pagina vale solo per questi filtri: cambiando ricerca o stato si riparte dalla prima
  const filtri = `${cerca}|${stato}`
  const [paginaScelta, setPaginaScelta] = useState({ filtri, numero: 0 })
  const numeroPagina = paginaScelta.filtri === filtri ? paginaScelta.numero : 0

  const { data, isFetching, error, refetch } = useListaUtentiQuery({
    search: cerca || undefined,
    status: stato || undefined,
    page: numeroPagina,
  })

  let contenuto
  if (!data && isFetching) {
    contenuto = <Caricamento riquadro testo="Carico gli utenti..." />
  } else if (error) {
    contenuto = <MessaggioErrore errore={error} onRiprova={refetch} />
  } else if (data && data.totaleElementi === 0) {
    contenuto = (
      <StatoVuoto
        icona="person_search"
        titolo="Nessun account trovato"
        messaggio={cerca || stato ? 'Prova con un’altra ricerca o un altro stato.' : 'Non ci sono ancora account registrati.'}
      />
    )
  } else if (data) {
    contenuto = (
      <div className="flex flex-col gap-space-md">
        <div className={cx('overflow-x-auto rounded-xl bg-surface-card transition-opacity', isFetching && 'opacity-60')}>
          <table className="w-full min-w-[40rem] text-left">
            <caption className="sr-only">Account registrati, dal più recente</caption>
            <thead>
              <tr className="font-label-code-status text-label-code-status uppercase text-outline">
                <th scope="col" className="px-space-sm py-space-sm font-normal">Account</th>
                <th scope="col" className="px-space-sm py-space-sm font-normal">Ruolo</th>
                <th scope="col" className="px-space-sm py-space-sm font-normal">Stato</th>
                <th scope="col" className="px-space-sm py-space-sm font-normal">Email</th>
                <th scope="col" className="px-space-sm py-space-sm font-normal">Registrazione</th>
              </tr>
            </thead>
            <tbody>
              {data.contenuto.map((u) => (
                <RigaUtente key={u.id} utente={u} />
              ))}
            </tbody>
          </table>
        </div>
        <Paginazione {...data} onCambia={(numero) => setPaginaScelta({ filtri, numero })} nomeElementi="account" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-xs">
        <p className="font-label-code-status text-label-code-status uppercase text-secondary">Amministrazione</p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Utenti e ruoli</h1>
      </header>

      <div className="grid gap-space-md sm:grid-cols-[1fr_14rem]">
        <TextField
          etichetta="Cerca"
          icona="search"
          type="search"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          maxLength={100}
          placeholder="Email, nome o cognome"
        />
        <Select etichetta="Stato" opzioni={OPZIONI_STATO} value={stato} onChange={(e) => setStato(e.target.value as StatoUtente | '')} />
      </div>

      {contenuto}
    </div>
  )
}
