import { useState } from 'react'
import {
  Button,
  Caricamento,
  ConfirmDialog,
  Icon,
  MessaggioErrore,
  Paginazione,
  Select,
  StatoVuoto,
  TextField,
  useAvviso,
  type Opzione,
} from '@/components/ui'
import { useCambiaRuoloMutation, useCambiaStatoUtenteMutation, useListaUtentiQuery } from '@/features/admin/apiAdmin'
import { useAppSelector } from '@/hooks/redux'
import { useValoreRitardato } from '@/hooks/useValoreRitardato'
import { cx } from '@/lib/cx'
import { leggiErrore } from '@/lib/errori'
import { giorno } from '@/lib/formato'
import { selezionaUtente } from '@/store/sessioneSlice'
import type { AdminUtenteResponse, Ruolo, StatoUtente, UtenteResponse } from '@/types/api'

// Pannello admin: utenti e ruoli (FE1-15), rotta /admin/users (solo ADMIN e SUPERADMIN).
// Passo 1: tabella con ricerca (email, nome, cognome), filtro per stato e paginazione.
// Passo 2: sospensione (con conferma: chiude le sessioni aperte) e riattivazione.
// Passo 3: cambio di ruolo USER ↔ ADMIN, solo per il SUPERADMIN (con conferma: l'utente deve rientrare).
// Passo 4: messaggi per gli errori dovuti a una tabella non aggiornata (un altro admin, o l'utente
// stesso, ha cambiato l'account nel frattempo). Dopo l'errore la tabella si ricarica da sola.

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

/** Si gestiscono solo ruoli inferiori al proprio, e mai se stessi (altrimenti 403 RUOLO_INSUFFICIENTE) */
const LIVELLO: Record<Ruolo, number> = { USER: 1, ADMIN: 2, SUPERADMIN: 3 }
const puoGestire = (io: UtenteResponse | null, altro: AdminUtenteResponse) =>
  !!io && io.id !== altro.id && LIVELLO[altro.ruolo] < LIVELLO[io.ruolo]

/** Il ruolo lo cambia solo il SUPERADMIN, mai il proprio e mai quello di un altro SUPERADMIN */
const puoCambiareRuolo = (io: UtenteResponse | null, altro: AdminUtenteResponse) =>
  io?.ruolo === 'SUPERADMIN' && io.id !== altro.id && altro.ruolo !== 'SUPERADMIN' && altro.stato !== 'ANONIMIZZATO'

/** Perche' il cambio di ruolo non e' possibile adesso (il backend risponderebbe 409), o undefined */
function bloccoRuolo(u: AdminUtenteResponse): string | undefined {
  if (!u.verificato) return 'L’email di questo account non è ancora verificata'
  if (u.stato !== 'ATTIVO') return 'Riattiva l’account prima di cambiarne il ruolo'
}

type AzioniRiga = {
  gestibile: boolean
  ruoloModificabile: boolean
  inCorso: boolean
  onSospendi: () => void
  onRiattiva: () => void
  onCambiaRuolo: () => void
}

/**
 * Messaggio con il nome dell'account per i rifiuti del backend previsti dalla card (piu' UTENTE_NON_ATTIVO
 * del cambio di ruolo); undefined per gli altri errori, che usano il testo generico del codice
 */
function messaggioRifiuto(errore: unknown, nome: string): { titolo: string; messaggio: string } | undefined {
  switch (leggiErrore(errore).codice) {
    case 'RUOLO_INSUFFICIENTE':
      return {
        titolo: 'Operazione non consentita',
        messaggio: `${nome} ora ha un ruolo uguale o superiore al tuo: non puoi più modificare questo account.`,
      }
    case 'UTENTE_ANONIMIZZATO':
      return {
        titolo: 'Account eliminato',
        messaggio: `L’account di ${nome} è stato anonimizzato su richiesta dell’utente: non si può più modificare.`,
      }
    case 'UTENTE_NON_VERIFICATO':
      return {
        titolo: 'Email da verificare',
        messaggio: `L’email di ${nome} non è ancora verificata: potrai cambiarne il ruolo dopo la verifica.`,
      }
    case 'UTENTE_NON_ATTIVO':
      return {
        titolo: 'Account non attivo',
        messaggio: `L’account di ${nome} è sospeso: riattivalo prima di cambiarne il ruolo.`,
      }
  }
}

/** Azione che chiede conferma */
type Conferma = { tipo: 'sospendi' | 'ruolo'; utente: AdminUtenteResponse }

const STATI: Record<StatoUtente, { etichetta: string; colore: string }> = {
  ATTIVO: { etichetta: 'Attivo', colore: 'bg-status-in-corso' },
  SOSPESO: { etichetta: 'Sospeso', colore: 'bg-tertiary' },
  ANONIMIZZATO: { etichetta: 'Anonimizzato', colore: 'bg-status-concluso' },
}

function RigaUtente({ utente, azioni }: { utente: AdminUtenteResponse; azioni: AzioniRiga }) {
  const nome = `${utente.nome} ${utente.cognome}`
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
      <td className="px-space-sm py-space-sm">
        {/* Un account anonimizzato non si tocca piu'; righe del proprio ruolo o superiore: niente azioni */}
        <div className="flex items-center justify-end gap-space-xs">
          {azioni.ruoloModificabile && (
            <Button
              variant="ghost"
              size="sm"
              icona={utente.ruolo === 'ADMIN' ? 'remove_moderator' : 'add_moderator'}
              onClick={azioni.onCambiaRuolo}
              disabled={bloccoRuolo(utente) !== undefined}
              title={bloccoRuolo(utente)}
              aria-label={utente.ruolo === 'ADMIN' ? `Togli il ruolo admin a ${nome}` : `Rendi admin ${nome}`}
            >
              {utente.ruolo === 'ADMIN' ? 'Togli admin' : 'Rendi admin'}
            </Button>
          )}
          {azioni.gestibile && utente.stato === 'ATTIVO' && (
            <Button variant="danger" size="sm" icona="block" onClick={azioni.onSospendi} aria-label={`Sospendi ${nome}`}>
              Sospendi
            </Button>
          )}
          {azioni.gestibile && utente.stato === 'SOSPESO' && (
            <Button
              variant="secondary"
              size="sm"
              icona="lock_open"
              onClick={azioni.onRiattiva}
              inCorso={azioni.inCorso}
              aria-label={`Riattiva ${nome}`}
            >
              Riattiva
            </Button>
          )}
        </div>
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

  const io = useAppSelector(selezionaUtente)
  const [cambiaStato, { isLoading: cambioInCorso, originalArgs }] = useCambiaStatoUtenteMutation()
  const [cambiaRuolo, { isLoading: cambioRuoloInCorso }] = useCambiaRuoloMutation()
  const [conferma, setConferma] = useState<Conferma | null>(null)
  const avviso = useAvviso()

  async function invertiRuolo(utente: AdminUtenteResponse) {
    const nome = `${utente.nome} ${utente.cognome}`
    const ruolo = utente.ruolo === 'ADMIN' ? 'USER' : 'ADMIN'
    try {
      await cambiaRuolo({ utenteId: utente.id, dati: { ruolo } }).unwrap()
      avviso.successo(
        ruolo === 'ADMIN' ? 'Ruolo admin assegnato' : 'Ruolo admin tolto',
        `${nome} vedrà il nuovo ruolo al prossimo accesso.`,
      )
    } catch (err) {
      const rifiuto = messaggioRifiuto(err, nome)
      if (rifiuto) avviso.attenzione(rifiuto.titolo, rifiuto.messaggio)
      else avviso.erroreApi(err)
    }
  }

  async function impostaStato(utente: AdminUtenteResponse, stato: 'ATTIVO' | 'SOSPESO') {
    const nome = `${utente.nome} ${utente.cognome}`
    try {
      await cambiaStato({ utenteId: utente.id, dati: { stato } }).unwrap()
      if (stato === 'SOSPESO') avviso.info('Account sospeso', `${nome} non può più accedere: le sessioni aperte sono state chiuse.`)
      else avviso.successo('Account riattivato', `${nome} può di nuovo accedere.`)
    } catch (err) {
      const rifiuto = messaggioRifiuto(err, nome)
      if (rifiuto) avviso.attenzione(rifiuto.titolo, rifiuto.messaggio)
      else avviso.erroreApi(err)
    }
  }

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
          <table className="w-full min-w-[52rem] text-left">
            <caption className="sr-only">Account registrati, dal più recente</caption>
            <thead>
              <tr className="font-label-code-status text-label-code-status uppercase text-outline">
                <th scope="col" className="px-space-sm py-space-sm font-normal">Account</th>
                <th scope="col" className="px-space-sm py-space-sm font-normal">Ruolo</th>
                <th scope="col" className="px-space-sm py-space-sm font-normal">Stato</th>
                <th scope="col" className="px-space-sm py-space-sm font-normal">Email</th>
                <th scope="col" className="px-space-sm py-space-sm font-normal">Registrazione</th>
                <th scope="col" className="px-space-sm py-space-sm text-right font-normal">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.contenuto.map((u) => (
                <RigaUtente
                  key={u.id}
                  utente={u}
                  azioni={{
                    gestibile: puoGestire(io, u),
                    ruoloModificabile: puoCambiareRuolo(io, u),
                    inCorso: cambioInCorso && originalArgs?.utenteId === u.id,
                    onSospendi: () => setConferma({ tipo: 'sospendi', utente: u }),
                    onRiattiva: () => impostaStato(u, 'ATTIVO'),
                    onCambiaRuolo: () => setConferma({ tipo: 'ruolo', utente: u }),
                  }}
                />
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

      <ConfirmDialog
        aperta={conferma !== null}
        titolo={
          conferma?.tipo === 'sospendi'
            ? 'Sospendere l’account?'
            : conferma?.utente.ruolo === 'ADMIN'
              ? 'Togliere il ruolo admin?'
              : 'Assegnare il ruolo admin?'
        }
        icona={conferma?.tipo === 'sospendi' ? 'block' : 'shield_person'}
        variante={conferma?.tipo === 'sospendi' ? 'danger' : 'primary'}
        testoConferma={conferma?.tipo === 'sospendi' ? 'Sospendi' : conferma?.utente.ruolo === 'ADMIN' ? 'Togli admin' : 'Rendi admin'}
        testoAnnulla="Annulla"
        inCorso={cambioInCorso || cambioRuoloInCorso}
        onConferma={async () => {
          if (conferma?.tipo === 'sospendi') await impostaStato(conferma.utente, 'SOSPESO')
          else if (conferma) await invertiRuolo(conferma.utente)
          setConferma(null)
        }}
        onAnnulla={() => setConferma(null)}
      >
        {conferma && (
          <p className="font-body-md text-body-md">
            {conferma.utente.nome} {conferma.utente.cognome} ({conferma.utente.email}){' '}
            {conferma.tipo === 'sospendi'
              ? 'non potrà più accedere e le sessioni aperte verranno chiuse subito. I suoi eventi restano. Potrai riattivare l’account quando vuoi.'
              : conferma.utente.ruolo === 'ADMIN'
                ? 'tornerà al ruolo Utente: non potrà più gestire gli account né il catalogo degli artisti. Dovrà accedere di nuovo.'
                : 'potrà gestire gli account con ruolo Utente, il catalogo degli artisti e la moderazione degli eventi. Dovrà accedere di nuovo.'}
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
