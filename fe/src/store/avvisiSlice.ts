import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

// Avvisi a comparsa (toast). Stanno nello store cosi' li puo' mostrare chiunque:
// un componente con useAvviso(), ma anche il codice che riceve le notifiche live
// dal WebSocket, con dispatch(mostraAvviso(...)).

export type TipoAvviso = 'successo' | 'errore' | 'info' | 'attenzione'

export type Avviso = {
  id: string
  tipo: TipoAvviso
  titolo: string
  messaggio?: string
  /** Millisecondi prima che sparisca da solo; 0 = resta finche' non lo si chiude */
  durata: number
  /** Pagina interna da aprire cliccando l'avviso (es. "/chat/c-01"); senza, non e' cliccabile */
  link?: string
  /**
   * Un avviso con la stessa chiave ancora a schermo viene sostituito (es. "chat-c-01": un solo
   * avviso per chat, con l'ultimo messaggio, invece di uno per messaggio)
   */
  chiave?: string
}

type NuovoAvviso = Omit<Avviso, 'id' | 'durata'> & { durata?: number }

// Oltre questo numero i piu' vecchi vengono tolti, per non riempire lo schermo.
const MASSIMO_AVVISI = 4

const avvisiSlice = createSlice({
  name: 'avvisi',
  initialState: [] as Avviso[],
  reducers: {
    mostraAvviso: {
      reducer(stato, azione: PayloadAction<Avviso>) {
        const { chiave } = azione.payload
        // Stessa chiave: il vecchio sparisce, il nuovo arriva in fondo con il tempo che riparte
        const altri = chiave ? stato.filter((a) => a.chiave !== chiave) : stato
        altri.push(azione.payload)
        return altri.slice(-MASSIMO_AVVISI)
      },
      prepare(avviso: NuovoAvviso) {
        const durata = avviso.durata ?? (avviso.tipo === 'errore' ? 8000 : 5000)
        return { payload: { ...avviso, durata, id: nanoid() } }
      },
    },
    chiudiAvviso(stato, azione: PayloadAction<string>) {
      return stato.filter((a) => a.id !== azione.payload)
    },
  },
})

export const { mostraAvviso, chiudiAvviso } = avvisiSlice.actions
export default avvisiSlice.reducer
