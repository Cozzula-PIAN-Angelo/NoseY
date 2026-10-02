import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { Avatar, Button, Caricamento, Icon, MessaggioErrore, StatoVuoto } from '@/components/ui'
import { useSessione } from '@/hooks/useSessione'
import { cx } from '@/lib/cx'
import type { ChatResponse, MessaggioResponse } from '@/types/api'
import { useListaMessaggiInfiniteQuery, useSegnaChatLettaMutation } from './apiSocial'
import { AvatarAmico } from './AvatarAmico'
import { FormMessaggio } from './FormMessaggio'
import { etichettaGiorno, ora, stessoGiorno } from './tempiChat'

// Una conversazione (FE2-12), come la colonna centrale della schermata Stitch "Community, Amicizie &
// Chat Live": intestazione con l'amico, messaggi (i propri a destra, in viola), campo di scrittura.
// - I messaggi arrivano da ListaMessaggi a cursore: i 30 piu' recenti, poi "Carica messaggi
//   precedenti" in cima, senza spostare quello che si sta leggendo. Quelli nuovi entrano nella cache
//   da soli (apiSocial, listaMessaggi): si scende in fondo solo se si era gia' li' (o se e' un proprio
//   messaggio).
// - Con nonLetti > 0 la chat si segna letta (SegnaChatLetta): all'apertura e a ogni messaggio
//   dell'amico che arriva mentre e' aperta.
// - puoiScrivere = false (amicizia rimossa, account non attivo): si legge, ma al posto del campo
//   c'e' l'avviso di sola lettura.
// Altezza: la finestra meno la barra in alto (e, da lg, l'intestazione della pagina), cosi' il
// campo di scrittura resta sempre visibile.
// Va montata con key={chat.id}: cambiando chat riparte da capo (scorrimento compreso).

/** Distanza dal fondo entro cui si considera di essere "in fondo" (px) */
const SOGLIA_FONDO = 80

export function Conversazione({ chat }: { chat: ChatResponse }) {
  const io = useSessione().utente?.id
  const { amico } = chat
  const nome = `${amico.nome} ${amico.cognome}`
  const { data, error, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useListaMessaggiInfiniteQuery(
    chat.id,
  )
  const [segnaLetta] = useSegnaChatLettaMutation()

  // Le pagine vanno dal piu' recente al piu' vecchio: a video servono al contrario
  const messaggi = useMemo(() => (data?.pages.flatMap((p) => p.messaggi) ?? []).toReversed(), [data])

  useEffect(() => {
    if (chat.nonLetti > 0) void segnaLetta(chat.id)
  }, [chat.id, chat.nonLetti, segnaLetta])

  // ---------- Scorrimento ----------
  const contenitore = useRef<HTMLDivElement>(null)
  const inFondo = useRef(true)
  /** Distanza dal fondo prima di caricare i precedenti, da ripristinare quando arrivano */
  const distanzaDalFondo = useRef<number | null>(null)
  const primoId = useRef<string | undefined>(undefined)
  const ultimoId = useRef<string | undefined>(undefined)

  useLayoutEffect(() => {
    const el = contenitore.current
    const primo = messaggi[0]
    const ultimo = messaggi.at(-1)
    if (!el || !primo || !ultimo) return
    if (primo.id !== primoId.current && distanzaDalFondo.current !== null) {
      // Arrivati i messaggi precedenti: resta fermo quello che si stava leggendo
      el.scrollTop = el.scrollHeight - distanzaDalFondo.current
      distanzaDalFondo.current = null
    } else if (ultimo.id !== ultimoId.current && (!ultimoId.current || inFondo.current || ultimo.mittenteId === io)) {
      // Apertura della chat o messaggio nuovo
      el.scrollTop = el.scrollHeight
    }
    primoId.current = primo.id
    ultimoId.current = ultimo.id
  }, [messaggi, io])

  function scorrimento() {
    const el = contenitore.current
    if (el) inFondo.current = el.scrollHeight - el.scrollTop - el.clientHeight < SOGLIA_FONDO
  }

  function caricaPrecedenti() {
    const el = contenitore.current
    if (el) distanzaDalFondo.current = el.scrollHeight - el.scrollTop
    void fetchNextPage()
  }

  let contenuto
  if (isLoading) {
    contenuto = <Caricamento riquadro testo="Carico i messaggi..." />
  } else if (error && !data) {
    contenuto = <MessaggioErrore errore={error} onRiprova={refetch} />
  } else if (messaggi.length === 0) {
    contenuto = (
      <StatoVuoto
        icona="waving_hand"
        titolo="Nessun messaggio"
        messaggio={chat.puoiScrivere ? `Rompi il ghiaccio: scrivi il primo messaggio a ${nome}.` : 'In questa chat non ci sono messaggi.'}
      />
    )
  } else {
    contenuto = (
      <ol className="flex flex-col gap-space-sm" aria-label={`Messaggi con ${nome}`}>
        {messaggi.map((m, i) => {
          const precedente = messaggi[i - 1]
          return (
            <Fragment key={m.id}>
              {(!precedente || !stessoGiorno(precedente.inviatoIl, m.inviatoIl)) && (
                <li className="my-space-xs flex justify-center" aria-hidden="true">
                  <span className="rounded-full bg-surface-container-lowest/80 px-space-md py-1 font-label-code-status text-[11px] text-on-surface-variant first-letter:uppercase">
                    {etichettaGiorno(m.inviatoIl)}
                  </span>
                </li>
              )}
              <Messaggio messaggio={m} mio={m.mittenteId === io} amico={amico} />
            </Fragment>
          )
        })}
      </ol>
    )
  }

  return (
    <section
      aria-label={`Chat con ${nome}`}
      className="flex h-[calc(100dvh-8rem)] max-h-[760px] min-h-[420px] flex-col lg:h-[calc(100dvh-15rem)] overflow-hidden rounded-xl bg-surface-glass shadow-2xl backdrop-blur-2xl"
    >
      <header className="flex shrink-0 items-center gap-space-sm bg-surface-container px-space-md py-space-sm">
        <Link
          to="/chat"
          aria-label="Torna alle chat"
          className="-ml-space-xs rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface lg:hidden"
        >
          <Icon nome="arrow_back" size={22} />
        </Link>
        <AvatarAmico amico={amico} anello="ring-surface-container" />
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-space-xs">
            <h2 className="truncate font-headline-sm text-headline-sm text-on-surface">{nome}</h2>
            <span
              className={cx(
                'shrink-0 rounded bg-surface-container-high px-1.5 font-label-code-status text-[10px] uppercase',
                chat.puoiScrivere ? 'text-secondary' : 'text-outline',
              )}
            >
              {chat.puoiScrivere ? 'Amici' : 'Sola lettura'}
            </span>
          </div>
          {!amico.attivo && (
            <span className="font-label-code-status text-label-code-status uppercase text-outline">Account non più attivo</span>
          )}
        </div>
      </header>

      {/* relative: i testi sr-only (absolute) restano qui dentro. Senza, il loro riferimento sarebbe la
          section (backdrop-blur fa da contenitore) che diventerebbe scorrevole e si sposterebbe al focus */}
      <div ref={contenitore} onScroll={scorrimento} className="relative min-h-0 flex-1 overflow-y-auto p-space-md">
        {hasNextPage && (
          <div className="mb-space-sm flex justify-center">
            <Button variant="ghost" size="sm" icona="history" inCorso={isFetchingNextPage} onClick={caricaPrecedenti}>
              Carica messaggi precedenti
            </Button>
          </div>
        )}
        {contenuto}
      </div>

      {chat.puoiScrivere ? (
        <FormMessaggio chatId={chat.id} nome={amico.nome} />
      ) : (
        <div className="flex shrink-0 items-start gap-space-sm bg-surface-container-low p-space-md">
          <Icon nome="lock" size={20} className="mt-0.5 text-outline" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Chat in sola lettura: puoi rileggere i messaggi, ma non scriverne di nuovi, perché l’amicizia non è più attiva
            o uno dei due account non è più attivo.
          </p>
        </div>
      )}
    </section>
  )
}

type MessaggioProps = {
  messaggio: MessaggioResponse
  mio: boolean
  amico: ChatResponse['amico']
}

function Messaggio({ messaggio: m, mio, amico }: MessaggioProps) {
  const orario = (
    <time
      dateTime={m.inviatoIl}
      className={cx('flex items-center gap-1 font-label-code-status text-[10px]', mio ? 'mr-1 text-secondary' : 'ml-1 text-outline')}
    >
      {ora(m.inviatoIl)}
      {mio && (
        <>
          <Icon nome={m.letto ? 'done_all' : 'done'} size={14} />
          <span className="sr-only">{m.letto ? 'letto' : 'inviato'}</span>
        </>
      )}
    </time>
  )

  if (mio) {
    return (
      <li className="ml-auto flex max-w-[82%] flex-col items-end gap-1">
        <span className="sr-only">Tu:</span>
        <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary p-space-md font-body-md text-body-md text-on-primary shadow-md">
          {m.testo}
        </div>
        {orario}
      </li>
    )
  }
  return (
    <li className="flex max-w-[82%] items-end gap-space-xs">
      <Avatar utente={amico} dimensione="sm" className="mb-5" />
      <div className="flex min-w-0 flex-col items-start gap-1">
        <span className="sr-only">{amico.nome}:</span>
        <div className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-surface-container p-space-md font-body-md text-body-md text-on-surface shadow-md">
          {m.testo}
        </div>
        {orario}
      </div>
    </li>
  )
}
