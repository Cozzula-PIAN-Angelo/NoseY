import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Icon } from '@/components/ui'
import { useContaNonLetteQuery } from '@/features/social/apiSocial'
import { useAppSelector } from '@/hooks/redux'
import { cx } from '@/lib/cx'
import { urlLogin } from '@/lib/dopoLogin'
import { selezionaUtente } from '@/store/sessioneSlice'
import { Marchio } from './Marchio'
import { MenuUtente } from './MenuUtente'

// Header fisso di tutte le pagine, copiato dalle schermate Stitch (stesse classi).
// Voci concordate in docs/interfacce.md: Esplora eventi, Mappa, Artisti, Community, I miei ticket;
// a destra campanella, "Crea evento" e menu utente (per l'ospite "Accedi").

type Voce = { etichetta: string; a: string; icona: string; attiva: (percorso: string) => boolean }

const voci: Voce[] = [
  {
    etichetta: 'Esplora Eventi',
    a: '/events',
    icona: 'explore',
    // Anche la home e il dettaglio di un evento, ma non "Crea evento" che ha il suo pulsante
    attiva: (p) => p === '/' || (p.startsWith('/events') && p !== '/events/new'),
  },
  { etichetta: 'Mappa', a: '/map', icona: 'radar', attiva: (p) => p === '/map' },
  { etichetta: 'Artisti', a: '/artists', icona: 'queue_music', attiva: (p) => p.startsWith('/artists') },
  {
    etichetta: 'Community & Amicizie',
    a: '/friends',
    icona: 'group',
    attiva: (p) => p.startsWith('/friends') || p.startsWith('/chat'),
  },
  { etichetta: 'I Miei Ticket', a: '/tickets', icona: 'confirmation_number', attiva: (p) => p === '/tickets' },
]

const vocePassiva =
  'font-label-btn text-label-btn text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
const voceAttiva = 'bg-surface-container text-on-surface font-headline-sm'

export function BarraNavigazione() {
  const utente = useAppSelector(selezionaUtente)
  const { pathname, search, hash } = useLocation()
  const [menuMobile, setMenuMobile] = useState(false)

  // Il menu su mobile si chiude a ogni cambio di pagina
  useEffect(() => setMenuMobile(false), [pathname])

  // Notifiche non lette (ContaNonLette, FE2-13): somma delle tre categorie. Si aggiorna da solo con
  // le notifiche e i messaggi live (features/social/useNotificheLive) e quando si segnano lette
  const { data: conteggi } = useContaNonLetteQuery(undefined, { skip: !utente })
  const nonLette = utente && conteggi ? conteggi.events + conteggi.friendships + conteggi.chats : 0

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface-glass shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-space-md px-margin-mobile md:px-margin">
        <div className="flex items-center gap-space-lg">
          <Link to="/" className="group flex items-center gap-space-sm focus:outline-none">
            <img
              src="/logo-nosey.png"
              alt=""
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex items-center gap-space-xs">
              <Marchio className="text-[28px] text-on-surface transition-colors group-hover:text-primary" />
              <span className="hidden items-center gap-1 rounded-full bg-surface-container px-space-xs py-0.5 font-label-code-status text-label-code-status uppercase tracking-wider text-status-in-corso sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-in-corso" />
                Live Hub
              </span>
            </div>
          </Link>

          <nav aria-label="Principale" className="hidden items-center gap-space-xs lg:flex">
            {voci.map((v) => {
              const attiva = v.attiva(pathname)
              return (
                <Link
                  key={v.a}
                  to={v.a}
                  aria-current={attiva ? 'page' : undefined}
                  className={cx('rounded-lg px-space-md py-space-xs transition-all', attiva ? voceAttiva : vocePassiva)}
                >
                  {v.etichetta}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-space-sm md:gap-space-md">
          {utente && (
            <Link
              to="/notifications"
              aria-label={nonLette > 0 ? `Notifiche, ${nonLette} non lette` : 'Notifiche'}
              className="relative flex items-center justify-center rounded-lg p-space-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon nome="notifications" size={22} />
              {nonLette > 0 && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-gold-piercing opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-gold-piercing" />
                </span>
              )}
            </Link>
          )}

          <Link
            to="/events/new"
            className="hidden items-center gap-space-xs rounded-lg bg-surface-container px-space-md py-space-xs font-label-btn text-label-btn text-tertiary shadow-[0_0_12px_rgba(245,158,11,0.12)] transition-all hover:bg-surface-container-high md:flex"
          >
            <Icon nome="add_circle" size={18} />
            <span>Crea Evento</span>
          </Link>

          {utente ? (
            <MenuUtente utente={utente} />
          ) : (
            // Su mobile solo l'icona, grande come l'hamburger: il testo ruberebbe spazio al logo
            <Link
              to={urlLogin(pathname + search + hash)}
              aria-label="Accedi"
              className="flex items-center gap-space-xs rounded-lg bg-primary p-space-xs font-label-btn text-label-btn text-on-primary shadow-md transition-all hover:bg-primary-container sm:px-space-md"
            >
              <Icon nome="login" size={20} />
              <span className="hidden sm:inline">Accedi</span>
            </Link>
          )}

          <button
            type="button"
            aria-label={menuMobile ? 'Chiudi il menu' : 'Apri il menu'}
            aria-expanded={menuMobile}
            onClick={() => setMenuMobile((m) => !m)}
            className="flex items-center justify-center rounded-lg p-space-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface lg:hidden"
          >
            <Icon nome={menuMobile ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {/* Su Stitch le voci spariscono sotto lg: qui finiscono in un pannello a tendina */}
      {menuMobile && (
        <nav aria-label="Principale" className="border-t border-border-glass px-margin-mobile py-space-sm md:px-margin lg:hidden">
          {voci.map((v) => {
            const attiva = v.attiva(pathname)
            return (
              <Link
                key={v.a}
                to={v.a}
                aria-current={attiva ? 'page' : undefined}
                className={cx(
                  'flex items-center gap-space-sm rounded-lg px-space-md py-space-sm transition-all',
                  attiva ? voceAttiva : vocePassiva,
                )}
              >
                <Icon nome={v.icona} />
                {v.etichetta}
              </Link>
            )
          })}
          <Link
            to="/events/new"
            className="mt-space-xs flex items-center gap-space-sm rounded-lg px-space-md py-space-sm font-label-btn text-label-btn text-tertiary transition-all hover:bg-surface-container md:hidden"
          >
            <Icon nome="add_circle" />
            Crea Evento
          </Link>
        </nav>
      )}
    </header>
  )
}
