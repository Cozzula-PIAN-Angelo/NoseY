import { cx } from '@/lib/cx'
import { pagineVisibili, type PaginaResponse } from '@/lib/pagine'
import { Icon } from './Icon'

// I quattro numeri arrivano cosi' come sono da PaginaResponse: pagina (da 0),
// dimensione, totaleElementi, totalePagine. "contenuto" e' ammesso ma non serve.
type PaginazioneProps = Omit<PaginaResponse<unknown>, 'contenuto'> & {
  contenuto?: unknown[]
  /** Chiamata con la nuova pagina (da 0), da passare come ?page= alla query */
  onCambia: (pagina: number) => void
  /** Nome degli elementi al plurale, es. "eventi", "notifiche" (default "risultati") */
  nomeElementi?: string
  className?: string
}

const classiPulsante =
  'rounded-xl font-label-btn text-label-btn transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container'

// Barra di paginazione come nella schermata Esplora Eventi di Stitch.
// Uso con RTK Query, passando direttamente la PaginaResponse:
//   const [pagina, setPagina] = useState(0)
//   const { data } = useNotificheQuery({ page: pagina, size: DIMENSIONE_PAGINA })
//   {data && <Paginazione {...data} onCambia={setPagina} nomeElementi="notifiche" />}
export function Paginazione({
  pagina,
  totalePagine,
  onCambia,
  totaleElementi,
  dimensione,
  nomeElementi = 'risultati',
  className,
}: PaginazioneProps) {
  // Lista vuota: al posto della paginazione la pagina mostra <StatoVuoto />
  if (totaleElementi === 0) return null

  const primo = pagina * dimensione + 1
  const ultimo = Math.min((pagina + 1) * dimensione, totaleElementi)

  return (
    <nav
      aria-label="Paginazione"
      className={cx(
        'flex flex-col items-center justify-between gap-space-md rounded-2xl bg-surface-card p-space-md sm:flex-row',
        className,
      )}
    >
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        {primo <= ultimo ? (
          <>
            Visualizzati <strong className="text-on-surface">{primo} - {ultimo}</strong> di{' '}
            <strong className="text-on-surface">
              {totaleElementi} {nomeElementi}
            </strong>
          </>
        ) : (
          // Pagina oltre la fine (es. dopo aver cancellato gli ultimi elementi)
          <>
            Pagina <strong className="text-on-surface">{pagina + 1}</strong> di{' '}
            <strong className="text-on-surface">{totalePagine}</strong>
          </>
        )}
      </p>

      {totalePagine > 1 && (
        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            onClick={() => onCambia(pagina - 1)}
            disabled={pagina === 0}
            className={cx(
              classiPulsante,
              'flex items-center gap-1 bg-surface-container px-space-sm py-space-xs text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface sm:px-space-md',
              'disabled:cursor-not-allowed disabled:text-outline disabled:hover:bg-surface-container',
            )}
          >
            <Icon nome="chevron_left" size={18} className="sm:hidden" />
            <span className="max-sm:sr-only">Precedente</span>
          </button>

          {/* Su schermi piccoli al posto dei numeri basta "2 / 5" */}
          <span className="px-space-sm font-label-btn text-label-btn text-on-surface-variant sm:hidden">
            {pagina + 1} / {totalePagine}
          </span>

          <ul className="hidden items-center gap-space-xs sm:flex">
            {pagineVisibili(pagina, totalePagine).map((n, i) =>
              n === null ? (
                <li key={`puntini-${i}`} aria-hidden="true" className="w-6 text-center text-outline">
                  …
                </li>
              ) : (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => onCambia(n)}
                    aria-current={n === pagina ? 'page' : undefined}
                    aria-label={`Pagina ${n + 1}`}
                    className={cx(
                      classiPulsante,
                      'flex size-9 items-center justify-center',
                      n === pagina
                        ? 'bg-primary text-on-primary shadow-md'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                    )}
                  >
                    {n + 1}
                  </button>
                </li>
              ),
            )}
          </ul>

          <button
            type="button"
            onClick={() => onCambia(pagina + 1)}
            disabled={pagina >= totalePagine - 1}
            className={cx(
              classiPulsante,
              'flex items-center gap-1 bg-surface-container px-space-sm py-space-xs text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface sm:px-space-md',
              'disabled:cursor-not-allowed disabled:text-outline disabled:hover:bg-surface-container',
            )}
          >
            <span className="max-sm:sr-only">Successivo</span>
            <Icon nome="chevron_right" size={18} className="sm:hidden" />
          </button>
        </div>
      )}
    </nav>
  )
}
