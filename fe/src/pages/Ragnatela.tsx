import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Icon } from '@/components/ui'
import { Mappa, type Coordinate, type MarkerMappa } from '@/components/mappa'
import { cx } from '@/lib/cx'
import { DettaglioSegnalazione } from '@/features/ragnatela/DettaglioSegnalazione'
import { RomboSegnalazione, SimboloRagnatela } from '@/features/ragnatela/Distintivi'
import { BenvenutoRagnatela, ElencoSegnalazioni, FiltriStato, type FiltroStato } from '@/features/ragnatela/ElencoSegnalazioni'
import { FormSegnalazione } from '@/features/ragnatela/FormSegnalazione'
import { statoAl } from '@/features/ragnatela/sequenza'
import { STATI, type NuovaSegnalazione, type Segnalazione } from '@/features/ragnatela/tipi'
import { annunciaUscitaRagnatela, PERCORSO_RAGNATELA } from '@/features/ragnatela/useCodiceSegreto'
import { useSegnalazioni } from '@/features/ragnatela/useSegnalazioni'
import '@/features/ragnatela/ragnatela.css'

// Modalita' Ragnatela (easter egg, Decisione 25): si apre scrivendo "spidey" o toccando 5 volte il
// logo (features/ragnatela/useCodiceSegreto). Schermate Stitch in docs/stitch/ragnatela/: header
// proprio, mappa radar a sinistra e "Dispaccio operativo" a destra; su mobile mappa a tutto schermo,
// foglio dal basso e barra in fondo. Tutto finto e solo nel browser: nessuna chiamata API.
// Copre il layout di App (header e footer del sito diventano inert) ma resta dentro App, cosi'
// sessione, WebSocket e avvisi a comparsa continuano a funzionare.

const ROMA: Coordinate = { lat: 41.8902, lng: 12.4922 }

type Pannello = { tipo: 'elenco' } | { tipo: 'nuova' } | { tipo: 'dettaglio'; id: string }

const titoli: Record<Pannello['tipo'], { occhiello: string; titolo: string }> = {
  elenco: { occhiello: 'Dispaccio operativo', titolo: 'Le mie segnalazioni' },
  nuova: { occhiello: 'Nuovo dispaccio', titolo: 'Nuova segnalazione' },
  dettaglio: { occhiello: 'Dispaccio operativo', titolo: 'Dettaglio segnalazione' },
}

/**
 * "Spider-segnale": pulsante rosso obliquo che apre "Nuova segnalazione", come quello al centro della
 * barra mobile di Stitch. Su desktop sta sulla mappa, piu' grande e con un anello che pulsa.
 */
// La posizione (relative nella barra, absolute sulla mappa) la decide chi lo usa, con className
function SpiderSegnale({ onClick, grande = false, className }: { onClick: () => void; grande?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label="Nuova segnalazione"
      title="Nuova segnalazione"
      onClick={onClick}
      className={cx(
        'rg-obliquo rg-azione z-10 flex cursor-pointer items-center justify-center border-2 border-white',
        grande ? 'size-16 shadow-[0_0_30px_rgba(226,35,40,0.75)]' : 'size-14',
        className,
      )}
    >
      {grande && <span aria-hidden="true" className="absolute -inset-1.5 border-2 border-(--rg-rosso)/60 motion-safe:animate-ping" />}
      <span className="rg-dritto">
        <Icon nome="crisis_alert" size={grande ? 32 : 28} />
      </span>
    </button>
  )
}

/** Pagina da cui si e' entrati (stato della rotta), solo se e' un percorso interno valido */
function paginaDiProvenienza(stato: unknown): string {
  if (typeof stato !== 'object' || stato === null || !('da' in stato)) return '/'
  const { da } = stato
  return typeof da === 'string' && da.startsWith('/') && !da.startsWith('//') && !da.startsWith(PERCORSO_RAGNATELA) ? da : '/'
}

export default function Ragnatela() {
  const navigate = useNavigate()
  const location = useLocation()
  const da = paginaDiProvenienza(location.state)
  const { segnalazioni, ora, crea, rispondi } = useSegnalazioni()

  const [pannello, setPannello] = useState<Pannello>({ tipo: 'elenco' })
  /** Solo su mobile: foglio dal basso aperto (su schermi larghi il pannello si vede sempre) */
  const [foglioAperto, setFoglioAperto] = useState(false)
  const [filtro, setFiltro] = useState<FiltroStato>('TUTTE')
  const [punto, setPunto] = useState<Coordinate | null>(null)
  const [centro, setCentro] = useState<Coordinate>(() => segnalazioni[0]?.punto ?? ROMA)
  const titoloPannello = useRef<HTMLHeadingElement>(null)
  const pannelloPrima = useRef('elenco|false')

  // Uscita con la tela che si ritira (la mostra App, sopra la pagina di NoseY che ricompare)
  const esci = useCallback(() => {
    annunciaUscitaRagnatela()
    navigate(da)
  }, [navigate, da])

  // Header e footer del sito restano sotto: fuori dal Tab e dallo screen reader, pagina ferma
  useEffect(() => {
    const esterni = [...document.querySelectorAll<HTMLElement>('header, footer')].filter(
      (el) => !el.closest('.modalita-ragnatela'),
    )
    for (const el of esterni) el.inert = true
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      for (const el of esterni) el.inert = false
      document.body.style.overflow = overflow
    }
  }, [])

  // Esc esce dalla modalita'
  useEffect(() => {
    function tasto(e: KeyboardEvent) {
      if (e.key === 'Escape' && !e.defaultPrevented) esci()
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [esci])

  // Cambiando pannello il focus va al suo titolo. Si confronta con il pannello di prima (e non con
  // "primo giro"): in sviluppo StrictMode esegue l'effetto due volte al montaggio.
  const chiavePannello = `${pannello.tipo === 'dettaglio' ? pannello.id : pannello.tipo}|${foglioAperto}`
  useEffect(() => {
    if (pannelloPrima.current !== chiavePannello) titoloPannello.current?.focus()
    pannelloPrima.current = chiavePannello
  }, [chiavePannello])

  const ordinate = useMemo(() => [...segnalazioni].sort((a, b) => b.creata - a.creata), [segnalazioni])
  const conteggi = useMemo(() => {
    const c: Record<FiltroStato, number> = { TUTTE: ordinate.length, APERTA: 0, IN_ARRIVO: 0, RISOLTA: 0 }
    for (const s of ordinate) c[statoAl(s, ora)]++
    return c
  }, [ordinate, ora])
  const filtrate = filtro === 'TUTTE' ? ordinate : ordinate.filter((s) => statoAl(s, ora) === filtro)
  const selezionata = pannello.tipo === 'dettaglio' ? ordinate.find((s) => s.id === pannello.id) : undefined

  function apri(s: Segnalazione) {
    setPannello({ tipo: 'dettaglio', id: s.id })
    setCentro(s.punto)
    setFoglioAperto(true)
  }

  function nuova() {
    // Se il form e' gia' aperto non si azzera il punto scelto
    if (pannello.tipo !== 'nuova') setPunto(null)
    setPannello({ tipo: 'nuova' })
    setFoglioAperto(true)
  }

  function invia(dati: NuovaSegnalazione) {
    const s = crea(dati)
    setFiltro('TUTTE')
    setPunto(null)
    apri(s)
  }

  const marker: MarkerMappa[] = filtrate.map((s) => {
    const stato = statoAl(s, ora)
    return {
      id: s.id,
      tipo: 'personalizzato',
      lat: s.punto.lat,
      lng: s.punto.lng,
      etichetta: s.titolo,
      descrizione: `segnalazione ${STATI[stato].etichetta.toLowerCase()}`,
      icona: <RomboSegnalazione stato={stato} categoria={s.categoria} selezionato={s.id === selezionata?.id} />,
      onClick: () => apri(s),
    }
  })

  const scelta = pannello.tipo === 'nuova'
  const t = titoli[selezionata || pannello.tipo !== 'dettaglio' ? pannello.tipo : 'elenco']

  return (
    <div className="modalita-ragnatela fixed inset-0 z-50 flex flex-col">
      {/* ---------- Header della modalita' ---------- */}
      <header className="z-20 shrink-0 border-b border-white/10 bg-[#0e1015]/95 shadow-[0_4px_30px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-space-md px-4 md:h-20 md:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <SimboloRagnatela />
            <h1 className="rg-obliquo border border-red-400/40 bg-(--rg-rosso) px-3 py-1 shadow-[0_0_20px_rgba(226,35,40,0.6)] md:px-4 md:py-1.5">
              <span className="rg-dritto rg-titolo text-xl font-bold tracking-wider text-white md:text-2xl">Ragnatela</span>
            </h1>
            <span className="hidden items-center gap-2 border border-white/10 bg-(--rg-superficie) px-3 py-1.5 sm:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="rg-titolo text-xs font-semibold tracking-widest text-emerald-400">Live radar 24/7</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="hidden border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 md:inline">Esc</kbd>
            <button
              type="button"
              onClick={esci}
              className="rg-obliquo cursor-pointer bg-(--rg-pannello) px-4 py-2 text-(--rg-inchiostro) shadow-[0_4px_14px_rgba(0,0,0,0.5)] transition-colors hover:bg-slate-200"
            >
              <span className="rg-dritto rg-titolo text-sm font-semibold tracking-wider">
                <Icon nome="logout" size={18} className="text-(--rg-rosso)" />
                Torna a NoseY
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 md:gap-4 md:p-4 lg:gap-8 lg:px-10 lg:py-6">
        {/* ---------- Mappa radar ---------- */}
        <section aria-label="Mappa radar" className="flex min-h-0 min-w-0 flex-1 flex-col md:gap-3">
          <div className="hidden items-center justify-between gap-3 border border-white/10 bg-(--rg-superficie) p-4 md:flex">
            <div>
              <span className="rg-titolo text-xs font-bold tracking-widest text-(--rg-oro)">Monitoraggio urbano</span>
              <h2 className="rg-titolo text-xl font-bold tracking-wide text-white lg:text-2xl">Mappa radar tattica</h2>
            </div>
            <span className="flex shrink-0 items-center gap-2 border border-(--rg-rosso)/50 bg-(--rg-rosso)/20 px-3 py-1 whitespace-nowrap">
              <span className="size-2 rounded-full bg-(--rg-rosso) motion-safe:animate-ping" />
              <span className="rg-titolo text-xs font-bold tracking-wider text-red-200 tabular-nums">
                {conteggi.APERTA + conteggi.IN_ARRIVO} attive
              </span>
            </span>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden md:border md:border-white/15 md:shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
            <Mappa
              centro={centro}
              zoom={14}
              stile="fiord"
              marker={marker}
              puntoScelto={scelta ? punto : null}
              onScegliPunto={scelta ? setPunto : undefined}
              etichetta={scelta ? 'Mappa: tocca il punto dove serve aiuto' : 'Mappa delle mie segnalazioni'}
              className="rg-mappa h-full"
            />
            {/* Radar decorativo sopra la mappa: griglia, anelli, mirino e cono che ruota */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
              <div className="rg-griglia-tattica absolute inset-0" />
              <div className="rg-radar aspect-square w-[min(120vw,900px)] rounded-full opacity-70" />
              <svg className="absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
                <line x1="50%" x2="50%" y1="0" y2="100%" stroke="rgba(255,255,255,0.10)" strokeDasharray="4,6" />
                <line x1="0" x2="100%" y1="50%" y2="50%" stroke="rgba(255,255,255,0.10)" strokeDasharray="4,6" />
                <circle cx="50%" cy="50%" r="70" fill="none" stroke="rgba(255,255,255,0.12)" />
                <circle cx="50%" cy="50%" r="140" fill="none" stroke="rgba(27,86,224,0.35)" strokeDasharray="6,4" />
                <circle cx="50%" cy="50%" r="210" fill="none" stroke="rgba(226,35,40,0.28)" />
                <circle cx="50%" cy="50%" r="280" fill="none" stroke="rgba(255,255,255,0.07)" strokeDasharray="2,6" />
              </svg>
            </div>
            {scelta && (
              <p className="pointer-events-none absolute top-3 left-3 flex max-w-[calc(100%-4.5rem)] items-center gap-2 border-l-4 border-(--rg-rosso) bg-(--rg-pannello) px-3 py-2 text-xs font-semibold text-(--rg-inchiostro) shadow-2xl">
                <Icon nome="touch_app" size={18} className="text-(--rg-rosso)" />
                {punto ? 'Punto scelto: tocca di nuovo per spostarlo' : 'Tocca la mappa dove serve aiuto'}
              </p>
            )}
            {/* Spider-segnale sulla mappa (su mobile sta al centro della barra in basso) */}
            <SpiderSegnale onClick={nuova} grande className="absolute right-5 bottom-10 hidden md:flex" />
          </div>

          <div className="hidden flex-wrap items-center justify-between gap-3 border border-white/10 bg-(--rg-superficie) px-4 py-2.5 md:flex">
            <FiltriStato filtro={filtro} conteggi={conteggi} onCambia={setFiltro} />
            <span className="rg-titolo hidden items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 lg:flex">
              <Icon nome="tune" size={16} className="text-(--rg-oro)" />
              Solo su questo dispositivo
            </span>
          </div>
        </section>

        {/* ---------- Dispaccio operativo: pannello a destra, foglio dal basso su mobile ---------- */}
        <section
          aria-label={t.titolo}
          className={cx(
            'rg-foglio absolute inset-x-0 bottom-0 z-10 flex-col border-t-2 border-(--rg-rosso) bg-(--rg-superficie) shadow-[0_-10px_30px_rgba(0,0,0,0.8)]',
            scelta ? 'max-h-[62%]' : 'max-h-[78%]',
            'md:static md:z-auto md:flex md:max-h-none md:w-[300px] md:shrink-0 md:gap-3 md:border-t-0 md:bg-transparent md:shadow-none lg:w-[440px]',
            foglioAperto ? 'flex' : 'hidden',
          )}
        >
          <div className="flex items-center justify-between gap-3 bg-(--rg-pannello) p-4 text-(--rg-inchiostro) md:border-t-4 md:border-(--rg-rosso) md:shadow-[0_12px_30px_rgba(0,0,0,0.6)]">
            <div>
              <span className="rg-titolo text-xs font-bold tracking-widest text-(--rg-oro-testo)">{t.occhiello}</span>
              <h2 ref={titoloPannello} tabIndex={-1} className="rg-titolo text-xl font-bold tracking-wide md:text-2xl">
                {t.titolo}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Chiudi il pannello e torna alla mappa"
              onClick={() => setFoglioAperto(false)}
              className="flex size-9 cursor-pointer items-center justify-center border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-(--rg-inchiostro) md:hidden"
            >
              <Icon nome="close" size={20} />
            </button>
          </div>

          {/* overflow-x nascosto e un po' di margine: gli elementi obliqui sbordano di qualche pixel */}
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:px-2 md:py-0 md:pb-2">
            {pannello.tipo === 'nuova' ? (
              <div className="flex flex-col gap-space-md">
                <button
                  type="button"
                  onClick={() => setPannello({ tipo: 'elenco' })}
                  className="rg-titolo flex w-fit cursor-pointer items-center gap-1 text-xs font-bold tracking-wider text-(--rg-testo-tenue) hover:text-white"
                >
                  <Icon nome="arrow_back" size={16} />
                  Annulla
                </button>
                <FormSegnalazione punto={punto} onInvia={invia} />
              </div>
            ) : selezionata ? (
              <DettaglioSegnalazione
                s={selezionata}
                ora={ora}
                onIndietro={() => setPannello({ tipo: 'elenco' })}
                onRispondi={(testo) => rispondi(selezionata.id, testo)}
              />
            ) : (
              <div className="flex flex-col gap-space-md">
                <button type="button" onClick={nuova} className="rg-obliquo rg-azione w-full cursor-pointer border border-red-400/40 px-6 py-3.5">
                  <span className="rg-dritto rg-titolo text-base font-bold tracking-wider lg:text-lg">
                    <Icon nome="add_circle" size={22} />
                    Invia nuova segnalazione
                  </span>
                </button>
                {ordinate.length === 0 ? (
                  <BenvenutoRagnatela onNuova={nuova} />
                ) : (
                  <>
                    <FiltriStato filtro={filtro} conteggi={conteggi} onCambia={setFiltro} className="md:hidden" />
                    <ElencoSegnalazioni segnalazioni={filtrate} ora={ora} onApri={apri} />
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ---------- Barra in basso (solo mobile) ---------- */}
      <nav aria-label="Ragnatela" className="z-20 shrink-0 border-t border-white/10 bg-[#0d0e12]/95 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          <button
            type="button"
            aria-pressed={!foglioAperto}
            onClick={() => setFoglioAperto(false)}
            className={cx('flex h-14 w-20 cursor-pointer flex-col items-center justify-center gap-1', !foglioAperto ? 'text-(--rg-rosso)' : 'text-slate-400 hover:text-white')}
          >
            <Icon nome="explore" size={22} />
            <span className="rg-titolo text-[11px] font-bold tracking-wider">Radar</span>
          </button>
          <SpiderSegnale onClick={nuova} className="relative -mt-6" />
          <button
            type="button"
            aria-pressed={foglioAperto && pannello.tipo !== 'nuova'}
            onClick={() => {
              setPannello({ tipo: 'elenco' })
              setFoglioAperto(true)
            }}
            className={cx(
              'flex h-14 w-20 cursor-pointer flex-col items-center justify-center gap-1',
              foglioAperto && pannello.tipo !== 'nuova' ? 'text-(--rg-rosso)' : 'text-slate-400 hover:text-white',
            )}
          >
            <Icon nome="view_timeline" size={22} />
            <span className="rg-titolo text-[11px] font-bold tracking-wider">Feed</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
