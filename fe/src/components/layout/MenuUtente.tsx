import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Icon } from '@/components/ui'
import { useAppDispatch } from '@/hooks/redux'
import { urlImmagine } from '@/lib/api'
import { haRuolo, uscita } from '@/store/sessioneSlice'
import type { UtenteResponse } from '@/types/utenti'

// Menu dell'avatar in alto a destra (Stitch, header di "Community, Amicizie & Chat Live").
// Voci concordate in docs/interfacce.md: profilo, i miei eventi, admin se il ruolo lo consente, esci.
// Su Stitch si apre al passaggio del mouse; qui al clic, cosi' funziona anche col touch e da tastiera.

const voce =
  'flex items-center gap-space-sm px-space-md py-space-xs font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors'

export function MenuUtente({ utente }: { utente: UtenteResponse }) {
  const [aperto, setAperto] = useState(false)
  const contenitore = useRef<HTMLDivElement>(null)
  const dispatch = useAppDispatch()
  const naviga = useNavigate()
  const { pathname } = useLocation()
  const avatar = urlImmagine(utente.immagineProfilo)

  // Si chiude cambiando pagina, cliccando fuori o con Esc
  useEffect(() => setAperto(false), [pathname])
  useEffect(() => {
    if (!aperto) return
    const fuori = (e: MouseEvent) => {
      if (!contenitore.current?.contains(e.target as Node)) setAperto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAperto(false)
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuori)
      document.removeEventListener('keydown', esc)
    }
  }, [aperto])

  function esci() {
    dispatch(uscita())
    naviga('/')
  }

  return (
    <div ref={contenitore} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={aperto}
        aria-label="Menu utente"
        onClick={() => setAperto((a) => !a)}
        className="flex items-center gap-space-xs rounded-full p-0.5 transition-all hover:ring-2 hover:ring-primary-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Icon nome="person" size={18} className="text-on-primary" />
          </div>
        )}
        <Icon nome="expand_more" size={18} className="hidden text-on-surface-variant sm:block" />
      </button>

      {aperto && (
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl bg-surface-card py-space-xs shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),0_0_24px_0_rgba(99,102,241,0.12)] backdrop-blur-2xl">
          <div className="bg-surface-container-low px-space-md py-space-sm">
            <div className="flex items-center gap-1">
              <p className="truncate font-headline-sm text-label-btn leading-snug text-on-surface">
                {utente.nome} {utente.cognome}
              </p>
              {haRuolo(utente, 'ADMIN') && <Icon nome="verified" size={16} className="text-secondary" />}
            </div>
            <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{utente.email}</p>
          </div>

          <div className="py-space-xs">
            <Link to="/profile" className={voce}>
              <Icon nome="account_circle" />
              Vedi Profilo
            </Link>
            <Link to="/my-events" className={voce}>
              <Icon nome="edit_calendar" />
              I Miei Eventi
            </Link>
            <Link to="/tickets" className={voce}>
              <Icon nome="qr_code_2" />
              Ticket Wallet
            </Link>
            <Link to="/friends" className={voce}>
              <Icon nome="group" />
              Amici &amp; Chat Live
            </Link>
          </div>

          {haRuolo(utente, 'ADMIN') && (
            <div className="border-t border-surface-container py-space-xs">
              <Link to="/admin/users" className={voce}>
                <Icon nome="manage_accounts" />
                Admin: Utenti
              </Link>
              <Link to="/admin/artists" className={voce}>
                <Icon nome="library_music" />
                Admin: Artisti
              </Link>
            </div>
          )}

          <div className="border-t border-surface-container pt-space-xs">
            <button
              type="button"
              onClick={esci}
              className="flex w-full items-center gap-space-sm px-space-md py-space-xs font-body-md text-body-md text-error transition-colors hover:bg-surface-container"
            >
              <Icon nome="logout" />
              Esci
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
