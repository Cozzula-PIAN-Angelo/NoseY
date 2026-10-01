// Testo e colore dello stato del WebSocket (lib/websocket, useStatoConnessione), uguali nella chat
// (FormMessaggio) e nella pagina delle notifiche.
import type { StatoConnessione } from '@/lib/websocket'

export const STATO_CONNESSIONE: Record<StatoConnessione, { testo: string; colore: string }> = {
  connesso: { testo: 'In linea', colore: 'bg-poi-ingresso' },
  connessione: { testo: 'Connessione...', colore: 'bg-accent-gold-piercing animate-pulse' },
  riconnessione: { testo: 'Riconnessione...', colore: 'bg-accent-gold-piercing animate-pulse' },
  assente: { testo: 'Non connesso', colore: 'bg-status-annullato' },
}
