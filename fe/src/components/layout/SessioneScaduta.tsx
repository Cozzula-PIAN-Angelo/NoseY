import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAvviso } from '@/components/ui'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { TESTI_ERRORE } from '@/lib/codiciErrore'
import { urlLogin } from '@/lib/dopoLogin'
import { scadutaGestita, selezionaScaduta } from '@/store/sessioneSlice'

// Dopo un 401 NON_AUTENTICATO (store/apiSlice.ts) la sessione e' gia' chiusa: qui si avvisa
// e si va a /login?redirect=<pagina attuale>, anche dalle pagine pubbliche (docs/interfacce.md).
// Sta nel layout perche' serve il router, che apiSlice non puo' importare.
export function SessioneScaduta() {
  const scaduta = useAppSelector(selezionaScaduta)
  const dispatch = useAppDispatch()
  const naviga = useNavigate()
  const avviso = useAvviso()
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (!scaduta) return
    dispatch(scadutaGestita())
    const { titolo, messaggio } = TESTI_ERRORE.NON_AUTENTICATO
    avviso.attenzione(titolo, messaggio)
    if (pathname !== '/login') naviga(urlLogin(pathname + search + hash), { replace: true })
  }, [scaduta, dispatch, avviso, naviga, pathname, search, hash])

  return null
}
