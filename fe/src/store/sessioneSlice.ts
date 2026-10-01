import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { LoginResponse, Ruolo, UtenteResponse } from '@/types/utenti'
import type { RootState } from './index'

// Chi ha fatto l'accesso. Salvata in localStorage per sopravvivere al ricaricamento della
// pagina; un token scaduto si scarta all'avvio (il backend non ha refresh token).
type StatoSessione = {
  token: string | null
  scadenza: string | null
  utente: UtenteResponse | null
}

const CHIAVE = 'nosey.sessione'
const vuota: StatoSessione = { token: null, scadenza: null, utente: null }

function leggi(): StatoSessione {
  try {
    const salvata = JSON.parse(localStorage.getItem(CHIAVE) ?? 'null') as StatoSessione | null
    if (salvata?.token && salvata.scadenza && new Date(salvata.scadenza) > new Date()) return salvata
  } catch {
    // localStorage non disponibile o dato rovinato: si riparte senza sessione
  }
  return vuota
}

function salva(stato: StatoSessione) {
  try {
    if (stato.token) localStorage.setItem(CHIAVE, JSON.stringify(stato))
    else localStorage.removeItem(CHIAVE)
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
      const nuovo = { token, scadenza, utente }
      salva(nuovo)
      return nuovo
    },
    /** Dopo VediProfilo o ModificaProfilo */
    utenteAggiornato(stato, azione: PayloadAction<UtenteResponse>) {
      stato.utente = azione.payload
      salva(stato)
    },
    /** "Esci", oppure un 401 NON_AUTENTICATO da qualunque chiamata */
    uscita() {
      salva(vuota)
      return vuota
    },
  },
})

export const { accesso, utenteAggiornato, uscita } = sessioneSlice.actions
export default sessioneSlice.reducer

const livello: Record<Ruolo, number> = { USER: 0, ADMIN: 1, SUPERADMIN: 2 }

export const selezionaUtente = (stato: RootState) => stato.sessione.utente
export const selezionaToken = (stato: RootState) => stato.sessione.token

/** true se l'utente ha almeno il ruolo indicato (SUPERADMIN vale anche come ADMIN) */
export const haRuolo = (utente: UtenteResponse | null, minimo: Ruolo) =>
  utente !== null && livello[utente.ruolo] >= livello[minimo]
