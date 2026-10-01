import { skipToken } from '@reduxjs/toolkit/query/react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, Caricamento, Icon, MessaggioErrore, Paginazione, StatoVuoto, stilePulsante, useAvviso } from '@/components/ui'
import {
  useContaNonLetteQuery,
  useListaNotificheQuery,
  useNotificheChatQuery,
  useSegnaTutteLetteMutation,
} from '@/features/social/apiSocial'
import { CATEGORIE_NOTIFICA } from '@/features/social/notifiche'
import { RigaNotifica } from '@/features/social/RigaNotifica'
import { STATO_CONNESSIONE } from '@/features/social/statoConnessione'
import { cx } from '@/lib/cx'
import { useStatoConnessione } from '@/lib/websocket'
import type { CategoriaNotifica } from '@/types/api'

// Notifiche (FE2-13), rotta /notifications (solo con il login). Non c'e' una schermata Stitch
// dedicata: le righe e i colori vengono dal pannello "Notifiche Feed" della schermata "Community,
// Amicizie & Chat Live", schede e riquadro dalla pagina Amici (FE2-10).
// - Schede Eventi / Amicizie / Chat (la scheda sta nell'URL: ?tab=friendships, ?tab=chats), ognuna
//   con le sue non lette in oro (ContaNonLette).
// - Eventi e amicizie sono a pagine (ListaNotificheEventi / ListaNotificheAmicizie); le chat no,
//   al massimo una notifica per chat con messaggi non letti (ListaNotificheChat).
// - "Segna tutte lette" vale per la scheda aperta (SegnaTutteLette?categoria=).
// - Le notifiche live le riceve useNotificheLive in tutta l'app: qui la lista si ricarica da sola.

const SCHEDE: Record<CategoriaNotifica, { icona: string; titolo: string; messaggio: string }> = {
  events: {
    icona: 'event',
    titolo: 'Nessuna notifica sugli eventi',
    messaggio: 'Qui arrivano le modifiche e gli annullamenti degli eventi a cui partecipi e le novità sui tuoi eventi.',
  },
  friendships: {
    icona: 'person_add',
    titolo: 'Nessuna notifica di amicizia',
    messaggio: 'Qui arrivano le richieste d’amicizia che ricevi e quelle che vengono accettate.',
  },
  chats: {
    icona: 'chat',
    titolo: 'Nessun messaggio da leggere',
    messaggio: 'Qui compaiono le chat con messaggi nuovi dei tuoi amici.',
  },
}

const leggiScheda = (valore: string | null): CategoriaNotifica =>
  valore === 'friendships' || valore === 'chats' ? valore : 'events'

export default function Notifiche() {
  const [parametri, setParametri] = useSearchParams()
  const scheda = leggiScheda(parametri.get('tab'))
  const [pagina, setPagina] = useState(0)
  const avviso = useAvviso()
  const stato = useStatoConnessione()

  const { data: conteggi } = useContaNonLetteQuery()
  // Ricaricate a ogni apertura: le notifiche arrivate mentre la pagina non era aperta ci sono gia'
  const paginata = useListaNotificheQuery(scheda === 'chats' ? skipToken : { categoria: scheda, page: pagina }, {
    refetchOnMountOrArgChange: true,
  })
  const chat = useNotificheChatQuery(scheda === 'chats' ? undefined : skipToken, { refetchOnMountOrArgChange: true })
  const [segnaTutte, { isLoading: segnando }] = useSegnaTutteLetteMutation()

  const { isFetching, error, refetch } = scheda === 'chats' ? chat : paginata
  const lista = scheda === 'chats' ? chat.currentData : paginata.currentData?.contenuto
  const nonLette = conteggi?.[scheda] ?? 0

  function apri(s: CategoriaNotifica) {
    setPagina(0)
    // replace: le schede non riempiono la cronologia del browser
    setParametri(s === 'events' ? {} : { tab: s }, { replace: true })
  }

  async function segnaTutteLette() {
    try {
      await segnaTutte(scheda).unwrap()
    } catch (e) {
      avviso.erroreApi(e)
    }
  }

  let contenuto
  if (!lista && isFetching) {
    contenuto = <Caricamento riquadro testo="Carico le notifiche..." />
  } else if (error) {
    contenuto = <MessaggioErrore errore={error} onRiprova={refetch} />
  } else if (lista && lista.length === 0 && pagina === 0) {
    const { icona, titolo, messaggio } = SCHEDE[scheda]
    contenuto = (
      <StatoVuoto
        icona={icona}
        titolo={titolo}
        messaggio={messaggio}
        azione={
          scheda === 'chats' && (
            <Link to="/chat" className={stilePulsante({ variant: 'secondary' })}>
              <Icon nome="forum" size={18} />
              Le tue chat
            </Link>
          )
        }
      />
    )
  } else if (lista) {
    contenuto = (
      <ul className="flex flex-col gap-1">
        {lista.map((n) => (
          <RigaNotifica key={n.id} notifica={n} />
        ))}
      </ul>
    )
  }

  const { testo: testoStato, colore } = STATO_CONNESSIONE[stato]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-space-lg px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-col gap-space-md sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-space-xs">
          <h1 className="flex items-center gap-space-xs font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">
            <Icon nome="notifications" size={32} className="text-primary" />
            Notifiche
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Modifiche agli eventi, richieste d’amicizia e messaggi, in tempo reale.
          </p>
        </div>
        {/* Come la pillola "STOMP ONLINE" nell'header della schermata Stitch */}
        <span
          role="status"
          className="flex items-center gap-space-xs self-start rounded-full bg-surface-container-low px-space-sm py-1 font-label-code-status text-label-code-status uppercase text-on-surface-variant sm:self-auto"
        >
          <span aria-hidden="true" className={cx('size-2 rounded-full', colore)} />
          {testoStato}
        </span>
      </header>

      <section className="flex flex-col gap-space-sm rounded-xl bg-surface-glass p-space-sm shadow-xl backdrop-blur-2xl">
        <div role="tablist" aria-label="Categorie di notifiche" className="grid grid-cols-3 gap-1 rounded-lg bg-surface-container-lowest p-1">
          {(Object.keys(SCHEDE) as CategoriaNotifica[]).map((s) => {
            const attiva = scheda === s
            const numero = conteggi?.[s] ?? 0
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
                <Icon nome={CATEGORIE_NOTIFICA[s].icona} size={18} className="max-sm:hidden" />
                {CATEGORIE_NOTIFICA[s].etichetta}
                {numero > 0 && (
                  <span
                    aria-label={`${numero} non lette`}
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-gold-piercing px-1 font-label-code-status text-label-code-status font-bold text-on-tertiary-container"
                  >
                    {numero > 99 ? '99+' : numero}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-space-sm px-space-xs">
          <span className="font-label-code-status text-label-code-status uppercase text-accent-gold-piercing">
            {nonLette > 0 ? `${nonLette} ${nonLette === 1 ? 'nuova' : 'nuove'}` : ''}
          </span>
          <Button variant="ghost" size="sm" icona="done_all" onClick={segnaTutteLette} disabled={nonLette === 0 || segnando}>
            Segna tutte lette
          </Button>
        </div>

        <div role="tabpanel" aria-label={CATEGORIE_NOTIFICA[scheda].etichetta}>
          {contenuto}
        </div>
      </section>

      {scheda !== 'chats' && paginata.currentData && (
        <Paginazione {...paginata.currentData} onCambia={setPagina} nomeElementi="notifiche" />
      )}
    </div>
  )
}
