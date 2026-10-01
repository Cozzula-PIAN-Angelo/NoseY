import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, Caricamento, Icon, MessaggioErrore, StatoVuoto, TextField, stilePulsante } from '@/components/ui'
import { useListaAmiciQuery, useRichiesteInviateQuery, useRichiesteRicevuteQuery } from '@/features/social/apiSocial'
import { RigaAmicizia } from '@/features/social/RigaAmicizia'
import { cx } from '@/lib/cx'

// Amici e richieste (FE2-10), rotta /friends (solo con il login), come la colonna "Social Radar" della
// schermata Stitch "Community, Amicizie & Chat Live": schede Amici / Ricevute / Inviate, filtro per
// nome, una riga per persona con le sue azioni (RigaAmicizia).
// La scheda aperta sta nell'URL (?tab=requests, ?tab=sent): le notifiche d'amicizia possono aprire
// direttamente le richieste ricevute. Le tre liste si caricano insieme per i contatori delle schede.

type Scheda = 'friends' | 'requests' | 'sent'

const SCHEDE: Record<Scheda, { etichetta: string; vuota: { icona: string; titolo: string; messaggio: string } }> = {
  friends: {
    etichetta: 'Amici',
    vuota: {
      icona: 'group',
      titolo: 'Ancora nessun amico',
      messaggio: 'Chiedi l’amicizia a chi partecipa ai tuoi stessi eventi, dalla lista dei partecipanti.',
    },
  },
  requests: {
    etichetta: 'Ricevute',
    vuota: { icona: 'inbox', titolo: 'Nessuna richiesta ricevuta', messaggio: 'Le richieste di amicizia che ricevi compaiono qui.' },
  },
  sent: {
    etichetta: 'Inviate',
    vuota: { icona: 'outbox', titolo: 'Nessuna richiesta in attesa', messaggio: 'Le richieste che invii restano qui finché non vengono accettate.' },
  },
}

const leggiScheda = (valore: string | null): Scheda => (valore === 'requests' || valore === 'sent' ? valore : 'friends')

export default function Amici() {
  const [parametri, setParametri] = useSearchParams()
  const scheda = leggiScheda(parametri.get('tab'))
  const [filtro, setFiltro] = useState('')
  const query = {
    friends: useListaAmiciQuery(),
    requests: useRichiesteRicevuteQuery(),
    sent: useRichiesteInviateQuery(),
  }
  const { currentData: lista, isFetching, error, refetch } = query[scheda]

  function apri(s: Scheda) {
    // replace: le schede non riempiono la cronologia del browser
    setParametri(s === 'friends' ? {} : { tab: s }, { replace: true })
  }

  const cercato = filtro.trim().toLowerCase()
  const visibili = (lista ?? []).filter((a) =>
    `${a.altroUtente.nome} ${a.altroUtente.cognome}`.toLowerCase().includes(cercato),
  )

  let contenuto
  if (!lista && isFetching) {
    contenuto = <Caricamento riquadro testo="Carico la lista..." />
  } else if (error) {
    contenuto = <MessaggioErrore errore={error} onRiprova={refetch} />
  } else if (lista && lista.length === 0) {
    const { icona, titolo, messaggio } = SCHEDE[scheda].vuota
    contenuto = (
      <StatoVuoto
        icona={icona}
        titolo={titolo}
        messaggio={messaggio}
        azione={
          scheda === 'friends' && (
            <Link to="/tickets" className={stilePulsante({ variant: 'secondary' })}>
              <Icon nome="confirmation_number" size={18} />
              I miei ticket
            </Link>
          )
        }
      />
    )
  } else if (lista && visibili.length === 0) {
    contenuto = (
      <StatoVuoto
        titolo="Nessun risultato"
        messaggio={`Nessuna persona in questa lista corrisponde a “${filtro.trim()}”.`}
        azione={
          <Button variant="secondary" onClick={() => setFiltro('')}>
            Reimposta ricerca
          </Button>
        }
      />
    )
  } else if (lista) {
    contenuto = (
      <ul className="flex flex-col gap-space-xs">
        {visibili.map((a) => (
          <RigaAmicizia key={a.id} amicizia={a} />
        ))}
      </ul>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-md sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-space-xs">
          <h1 className="flex items-center gap-space-xs font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">
            <Icon nome="diversity_3" size={32} className="text-primary" />
            Amici e richieste
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Le persone conosciute agli eventi: accetta le richieste e scrivi agli amici in chat.
          </p>
        </div>
        <Link to="/chat" className={cx(stilePulsante({ variant: 'secondary' }), 'self-start')}>
          <Icon nome="chat" size={18} />
          Le tue chat
        </Link>
      </header>

      <section className="flex flex-col gap-space-sm rounded-xl bg-surface-glass p-space-sm shadow-xl backdrop-blur-2xl">
        <div role="tablist" aria-label="Amicizie" className="grid grid-cols-3 gap-1 rounded-lg bg-surface-container-lowest p-1">
          {(Object.keys(SCHEDE) as Scheda[]).map((s) => {
            const attiva = scheda === s
            const numero = query[s].data?.length
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={attiva}
                onClick={() => apri(s)}
                className={cx(
                  'flex items-center justify-center gap-1 rounded-md py-space-xs font-label-btn text-label-btn transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
                  attiva ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {SCHEDE[s].etichetta}
                {/* Come in Stitch: il numero degli amici e, in oro, le richieste ricevute da gestire */}
                {s === 'friends' && numero !== undefined && (
                  <span
                    className={cx(
                      'rounded-full px-1.5 font-label-code-status text-label-code-status',
                      attiva ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high',
                    )}
                  >
                    {numero}
                  </span>
                )}
                {s === 'requests' && !!numero && (
                  <span
                    className="flex size-5 items-center justify-center rounded-full bg-accent-gold-piercing font-label-code-status text-label-code-status font-bold text-on-tertiary-container"
                  >
                    {numero}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <TextField
          aria-label="Filtra per nome"
          icona="search"
          type="search"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          maxLength={100}
          placeholder="Filtra per nome..."
        />

        <div role="tabpanel" aria-label={SCHEDE[scheda].etichetta}>
          {contenuto}
        </div>
      </section>
    </div>
  )
}
