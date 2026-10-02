import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button, Caricamento, Icon, MessaggioErrore, StatoVuoto, TextField, stilePulsante } from '@/components/ui'
import { useListaChatQuery } from '@/features/social/apiSocial'
import { Conversazione } from '@/features/social/Conversazione'
import { ElencoChat } from '@/features/social/ElencoChat'
import { STATO_CONNESSIONE } from '@/features/social/statoConnessione'
import { cx } from '@/lib/cx'
import { useStatoConnessione, type StatoConnessione } from '@/lib/websocket'
import PaginaNonTrovata from '@/pages/PaginaNonTrovata'

// Chat (FE2-12), rotte /chat e /chat/:chatId (solo con il login), come la schermata Stitch
// "Community, Amicizie & Chat Live": a sinistra l'elenco delle chat con il filtro per nome, al centro
// la conversazione aperta. Su schermi stretti si vede una cosa per volta: /chat l'elenco,
// /chat/:chatId la conversazione (con la freccia per tornare all'elenco).
// Una chat che non e' nell'elenco non e' dell'utente (ListaChat le restituisce tutte, anche quelle
// in sola lettura): pagina 404. L'elenco si ricarica a ogni apertura della pagina, cosi' una chat
// appena nata non risulta inesistente per colpa della cache.
// In alto, al posto del titolo, la barra sottile di Stitch con lo stato vero della connessione
// (card "Extra: chat a tre colonne"), senza le scritte tecniche ("STOMP /WS CONNECTED", "E2EE").

/** Frase della barra di stato; colore del pallino da STATO_CONNESSIONE, come nel resto della chat */
const FRASI_CONNESSIONE: Record<StatoConnessione, string> = {
  connesso: 'Connesso in tempo reale: i messaggi arrivano subito',
  connessione: 'Connessione in corso…',
  riconnessione: 'Riconnessione… i messaggi arriveranno appena torna la linea',
  assente: 'Non connesso: i nuovi messaggi compariranno ricaricando la pagina',
}

export default function Chat() {
  const { chatId } = useParams()
  const { data: lista, isFetching, error, refetch } = useListaChatQuery(undefined, { refetchOnMountOrArgChange: true })
  const [filtro, setFiltro] = useState('')
  const connessione = useStatoConnessione()

  const aperta = chatId ? lista?.find((c) => c.id === chatId) : undefined
  if (chatId && lista && !aperta && !isFetching) return <PaginaNonTrovata />

  const cercato = filtro.trim().toLowerCase()
  const visibili = (lista ?? []).filter((c) => `${c.amico.nome} ${c.amico.cognome}`.toLowerCase().includes(cercato))

  let elenco
  if (!lista && isFetching) {
    elenco = <Caricamento riquadro testo="Carico le chat..." />
  } else if (error && !lista) {
    elenco = <MessaggioErrore errore={error} onRiprova={refetch} />
  } else if (lista && lista.length === 0) {
    elenco = (
      <StatoVuoto
        icona="forum"
        titolo="Ancora nessuna chat"
        messaggio="Una chat si apre quando un’amicizia viene accettata."
        azione={
          <Link to="/friends" className={stilePulsante({ variant: 'secondary' })}>
            <Icon nome="diversity_3" size={18} />
            Amici e richieste
          </Link>
        }
      />
    )
  } else if (lista && visibili.length === 0) {
    elenco = (
      <StatoVuoto
        titolo="Nessun risultato"
        messaggio={`Nessuna chat corrisponde a “${filtro.trim()}”.`}
        azione={
          <Button variant="secondary" onClick={() => setFiltro('')}>
            Reimposta ricerca
          </Button>
        }
      />
    )
  } else if (lista) {
    elenco = <ElencoChat chat={visibili} aperta={chatId} />
  }

  let conversazione
  if (aperta) {
    conversazione = <Conversazione key={aperta.id} chat={aperta} />
  } else if (chatId) {
    // Elenco ancora in caricamento (o in errore: lo mostra gia' la colonna dell'elenco)
    conversazione = error ? <MessaggioErrore errore={error} onRiprova={refetch} /> : <Caricamento riquadro testo="Apro la chat..." />
  } else {
    conversazione = (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl bg-surface-glass shadow-2xl backdrop-blur-2xl">
        <StatoVuoto icona="chat" titolo="Scegli una chat" messaggio="Apri una conversazione dall’elenco per leggere e scrivere i messaggi." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-md px-margin-mobile py-space-lg md:px-margin">
      {/* Il titolo resta per gli screen reader; a vista c'e' la barra di stato, come in Stitch */}
      <h1 className="sr-only">Chat</h1>
      <div
        className={cx(
          'flex-wrap items-center justify-between gap-space-sm rounded-xl bg-surface-container-low px-space-md py-space-xs',
          // Su schermi stretti, con una chat aperta, conta solo la conversazione
          chatId ? 'hidden lg:flex' : 'flex',
        )}
      >
        <p role="status" className="flex items-center gap-space-xs font-label-code-status text-label-code-status uppercase text-on-surface-variant">
          <span aria-hidden="true" className={cx('size-2 rounded-full', STATO_CONNESSIONE[connessione].colore)} />
          {FRASI_CONNESSIONE[connessione]}
        </p>
        <Link to="/friends" className={stilePulsante({ variant: 'ghost', size: 'sm' })}>
          <Icon nome="diversity_3" size={16} />
          Amici e richieste
        </Link>
      </div>

      <div className="grid grid-cols-1 items-start gap-space-md lg:grid-cols-12">
        <section
          aria-label="Le tue chat"
          className={cx(
            'flex-col gap-space-sm rounded-xl bg-surface-glass p-space-sm shadow-xl backdrop-blur-2xl lg:col-span-4',
            chatId ? 'hidden lg:flex' : 'flex',
          )}
        >
          <TextField
            aria-label="Filtra per nome"
            icona="search"
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            maxLength={100}
            placeholder="Filtra per nome..."
          />
          <div className="lg:max-h-[680px] lg:overflow-y-auto">{elenco}</div>
        </section>

        <div className={cx('lg:col-span-8', chatId ? 'block' : 'hidden lg:block')}>{conversazione}</div>
      </div>
    </div>
  )
}
