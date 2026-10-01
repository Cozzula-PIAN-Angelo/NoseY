import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { LoginResponse, Ruolo, UtenteResponse } from '@/types/utenti'
import type { RootState } from './index'

// Chi ha fatto l'accesso. Salvata in localStorage per sopravvivere al ricaricamento della
// pagina; un token scaduto si scarta all'avvio (il backend non ha refresh token).
type SessioneSalvata = {
  token: string | null
  scadenza: string | null
  utente: UtenteResponse | null
}

type StatoSessione = SessioneSalvata & {
  /** true dopo un 401 NON_AUTENTICATO: components/layout/SessioneScaduta avvisa e porta al login */
  scaduta: boolean
}

/** Chiave in localStorage: la usa anche ControlloSessione per seguire le altre schede */
export const CHIAVE_SESSIONE = 'nosey.sessione'
const vuota: SessioneSalvata = { token: null, scadenza: null, utente: null }

// Sessione dal testo salvato in localStorage; vuota se manca, e' rovinata o il token e' scaduto
function daTesto(testo: string | null): StatoSessione {
  try {
    const salvata = JSON.parse(testo ?? 'null') as SessioneSalvata | null
    if (salvata?.token && salvata.scadenza && new Date(salvata.scadenza) > new Date()) {
      return { ...salvata, scaduta: false }
    }
  } catch {
    // Dato rovinato: si riparte senza sessione
  }
  return { ...vuota, scaduta: false }
}

function leggi(): StatoSessione {
  try {
    return daTesto(localStorage.getItem(CHIAVE_SESSIONE))
  } catch {
    // localStorage non disponibile (es. bloccato dal browser)
    return { ...vuota, scaduta: false }
  }
}

function salva({ token, scadenza, utente }: SessioneSalvata) {
  try {
    if (token) localStorage.setItem(CHIAVE_SESSIONE, JSON.stringify({ token, scadenza, utente }))
    else localStorage.removeItem(CHIAVE_SESSIONE)
  } catch {
    // Senza localStorage la sessione dura finche' la pagina resta aperta
  }
}

const sessioneSlice = createSlice({
  name: 'sessione',
  initialState: leggi,
  reducers: {
    /** Dopo Login o Verifica */
    accesso(_stato, azione: PayloadAction<LoginResponse>) {
      const { token, scadenza, utente } = azione.payload
      salva({ token, scadenza, utente })
      return { token, scadenza, utente, scaduta: false }
    },
    /** Dopo VediProfilo o ModificaProfilo */
    utenteAggiornato(stato, azione: PayloadAction<UtenteResponse>) {
      // Risposta arrivata dopo l'uscita: non deve far ricomparire un utente senza token
      if (!stato.token) return
      stato.utente = azione.payload
      salva(stato)
    },
    /** "Esci" dal menu utente */
    uscita() {
      salva(vuota)
      return { ...vuota, scaduta: false }
    },
    /** 401 NON_AUTENTICATO da una chiamata (store/apiSlice.ts): token scaduto o revocato */
    sessioneScaduta() {
      salva(vuota)
      return { ...vuota, scaduta: true }
    },
    /** Login o uscita in un'altra scheda: arriva il nuovo valore di localStorage (gia' salvato) */
    sessioneDaAltraScheda(_stato, azione: PayloadAction<string | null>) {
      return daTesto(azione.payload)
    },
    /** L'avviso di sessione scaduta e' stato mostrato */
    scadutaGestita(stato) {
      stato.scaduta = false
    },
  },
})

export const { accesso, utenteAggiornato, uscita, sessioneScaduta, sessioneDaAltraScheda, scadutaGestita } =
  sessioneSlice.actions
export default sessioneSlice.reducer

const livello: Record<Ruolo, number> = { USER: 0, ADMIN: 1, SUPERADMIN: 2 }

export const selezionaUtente = (stato: RootState) => stato.sessione.utente
export const selezionaToken = (stato: RootState) => stato.sessione.token
export const selezionaScaduta = (stato: RootState) => stato.sessione.scaduta

/** true se l'utente ha almeno il ruolo indicato (SUPERADMIN vale anche come ADMIN) */
export const haRuolo = (utente: UtenteResponse | null, minimo: Ruolo) =>
  utente !== null && livello[utente.ruolo] >= livello[minimo]
