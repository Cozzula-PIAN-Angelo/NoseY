import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button, Caricamento, Icon, MessaggioErrore, StatoVuoto, TextField, stilePulsante } from '@/components/ui'
import { useListaChatQuery } from '@/features/social/apiSocial'
import { Conversazione } from '@/features/social/Conversazione'
import { ElencoChat } from '@/features/social/ElencoChat'
import { cx } from '@/lib/cx'
import PaginaNonTrovata from '@/pages/PaginaNonTrovata'

// Chat (FE2-12), rotte /chat e /chat/:chatId (solo con il login), come la schermata Stitch
// "Community, Amicizie & Chat Live": a sinistra l'elenco delle chat con il filtro per nome, al centro
// la conversazione aperta. Su schermi stretti si vede una cosa per volta: /chat l'elenco,
// /chat/:chatId la conversazione (con la freccia per tornare all'elenco).
// Una chat che non e' nell'elenco non e' dell'utente (ListaChat le restituisce tutte, anche quelle
// in sola lettura): pagina 404. L'elenco si ricarica a ogni apertura della pagina, cosi' una chat
// appena nata non risulta inesistente per colpa della cache.

export default function Chat() {
  const { chatId } = useParams()
  const { data: lista, isFetching, error, refetch } = useListaChatQuery(undefined, { refetchOnMountOrArgChange: true })
  const [filtro, setFiltro] = useState('')

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header
        className={cx(
          'flex-col gap-space-md sm:flex-row sm:items-end sm:justify-between',
          // Su schermi stretti, con una chat aperta, conta solo la conversazione
          chatId ? 'hidden lg:flex' : 'flex',
        )}
      >
        <div className="flex flex-col gap-space-xs">
          <h1 className="flex items-center gap-space-xs font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">
            <Icon nome="forum" size={32} className="text-primary" />
            Chat
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Le conversazioni con i tuoi amici, in tempo reale.
          </p>
        </div>
        <Link to="/friends" className={cx(stilePulsante({ variant: 'secondary' }), 'self-start')}>
          <Icon nome="diversity_3" size={18} />
          Amici e richieste
        </Link>
      </header>

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
