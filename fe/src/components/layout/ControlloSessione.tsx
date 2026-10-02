import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useVediProfiloQuery } from '@/features/utenti/apiUtenti'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { apiSlice } from '@/store/apiSlice'
import { CHIAVE_SESSIONE, selezionaToken, sessioneDaAltraScheda, sessioneScaduta, uscita } from '@/store/sessioneSlice'

/** State della navigazione verso la home che chiude la sessione (vedi sotto) */
export type StatoUscita = { uscita: true }

// Tiene la sessione allineata col backend finche' l'app e' aperta (FE2-02, passi 4 e 5):
// - all'avvio (e dopo ogni login) GET /api/users/me: ruolo, nome o avatar possono essere
//   cambiati da un'altra parte. Intanto l'app usa l'utente salvato, senza attese;
//   un 401 (token revocato) chiude la sessione tramite apiSlice.
// - alla scadenza del token (24 ore, niente refresh) si esce come per un 401, senza
//   aspettare la prossima chiamata.
// - login o uscita in un'altra scheda dello stesso browser: questa scheda si allinea
// - dopo l'eliminazione dell'account (FE2-14) chiude la sessione arrivati alla home

// setTimeout accetta al massimo ~24,8 giorni: oltre, il timer scatterebbe subito
const ATTESA_MASSIMA = 2 ** 31 - 1

export function ControlloSessione() {
  const token = useAppSelector(selezionaToken)
  const scadenza = useAppSelector((s) => s.sessione.scadenza)
  const dispatch = useAppDispatch()

  useVediProfiloQuery(undefined, { skip: !token })

  useEffect(() => {
    if (!token || !scadenza) return
    const attesa = new Date(scadenza).getTime() - Date.now()
    if (attesa > ATTESA_MASSIMA) return
    const timer = setTimeout(() => {
      dispatch(sessioneScaduta())
      dispatch(apiSlice.util.resetApiState())
    }, Math.max(attesa, 0))
    return () => clearTimeout(timer)
  }, [token, scadenza, dispatch])

  // L'evento storage arriva solo alle ALTRE schede: chi ha scritto e' gia' aggiornato
  const tokenAttuale = useRef(token)
  useEffect(() => {
    tokenAttuale.current = token
  }, [token])
  useEffect(() => {
    function cambiata(e: StorageEvent) {
      if (e.key !== CHIAVE_SESSIONE && e.key !== null) return
      dispatch(sessioneDaAltraScheda(e.key === null ? null : e.newValue))
      // Utente diverso o uscito: via i dati in cache di quello di prima
      let nuovoToken: string | null = null
      try {
        nuovoToken = (JSON.parse(e.newValue ?? 'null') as { token?: string } | null)?.token ?? null
      } catch {
        // dato rovinato: equivale a nessuna sessione
      }
      if (nuovoToken !== tokenAttuale.current) dispatch(apiSlice.util.resetApiState())
    }
    window.addEventListener('storage', cambiata)
    return () => window.removeEventListener('storage', cambiata)
  }, [dispatch])

  // Uscita dopo l'eliminazione dell'account (FE2-14): il token e' gia' revocato dal backend.
  // Come "Esci" (MenuUtente) prima si arriva alla home, poi si chiude la sessione: chiudendola
  // sulla pagina protetta /profile, la sua rotta rimanderebbe al login. EliminaAccount pero'
  // sparisce con la pagina, quindi l'uscita la fa questo componente, che resta sempre montato:
  // la pagina naviga a "/" con state { uscita: true }, qui si esce e si toglie lo state
  // (cosi' tornando indietro a quella voce della cronologia non si esce di nuovo).
  const { pathname, state } = useLocation()
  const naviga = useNavigate()
  const daChiudere = pathname === '/' && (state as StatoUscita | null)?.uscita === true
  useEffect(() => {
    if (!daChiudere) return
    dispatch(uscita())
    dispatch(apiSlice.util.resetApiState())
    naviga('/', { replace: true, state: null })
  }, [daChiudere, dispatch, naviga])

  return null
}
