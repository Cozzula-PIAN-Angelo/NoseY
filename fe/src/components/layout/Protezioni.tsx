import { useEffect, useRef } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useAvviso } from '@/components/ui'
import { useAppSelector } from '@/hooks/redux'
import { TESTI_ERRORE } from '@/lib/codiciErrore'
import { haRuolo, selezionaUtente } from '@/store/sessioneSlice'
import type { Ruolo } from '@/types/utenti'

// Rotte "contenitore" di src/router.tsx: senza path, mostrano le rotte figlie (Outlet)
// solo se la regola d'accesso di docs/interfacce.md e' rispettata, altrimenti rimandano altrove.

/** *login*: serve l'accesso, altrimenti pagina di login */
export function SoloConLogin() {
  const utente = useAppSelector(selezionaUtente)
  return utente ? <Outlet /> : <Navigate to="/login" replace />
}

/** *ospite*: solo chi non ha fatto l'accesso (login, registrazione...); gli altri vanno alla home */
export function SoloOspiti() {
  const utente = useAppSelector(selezionaUtente)
  return utente ? <Navigate to="/" replace /> : <Outlet />
}

/** *ADMIN* / *SUPERADMIN*: ruolo minimo. Senza login → login; ruolo insufficiente → home con avviso */
export function SoloRuolo({ minimo }: { minimo: Ruolo }) {
  const utente = useAppSelector(selezionaUtente)
  if (!utente) return <Navigate to="/login" replace />
  return haRuolo(utente, minimo) ? <Outlet /> : <AccessoNegato />
}

function AccessoNegato() {
  const avviso = useAvviso()
  // In sviluppo StrictMode ripete gli effetti: senza questo controllo l'avviso uscirebbe due volte
  const mostrato = useRef(false)

  useEffect(() => {
    if (mostrato.current) return
    mostrato.current = true
    const { titolo, messaggio } = TESTI_ERRORE.ACCESSO_NEGATO
    avviso.errore(titolo, messaggio)
  }, [avviso])

  return <Navigate to="/" replace />
}
