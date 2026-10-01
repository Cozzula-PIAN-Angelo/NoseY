import type { StatoAmicizia, UtentePubblicoResponse, Uuid } from '@/types/api'

export type PulsanteAmiciziaProps = {
  /** L'altra persona (nome per le etichette accessibili, attivo per disattivare il pulsante) */
  utente: UtentePubblicoResponse
  /** Stato visto da chi guarda, come arriva da ListaPartecipanti */
  statoAmicizia: StatoAmicizia
  /** Valorizzato con INVIATA, RICEVUTA e AMICI: serve per ritirare, accettare e rifiutare */
  amiciziaId: Uuid | null
  /** Evento in comune: la richiesta parte sempre da un evento (RichiediAmicizia) */
  eventoId: Uuid
}

/** Stato scritto accanto al pulsante, come nella colonna "Partecipanti" di Stitch */
const ETICHETTE: Partial<Record<StatoAmicizia, { testo: string; colore: string }>> = {
  INVIATA: { testo: 'In attesa', colore: 'text-tertiary' },
  RICEVUTA: { testo: 'Richiesta ricevuta', colore: 'text-accent-gold-piercing' },
  AMICI: { testo: 'Amici', colore: 'text-status-in-corso' },
}

// Pulsante amicizia (FE2-09), usato da FE1 nella lista dei partecipanti (FE1-14). Mostra l'azione
// giusta per statoAmicizia (progettazione v4, sezioni 7 e 8):
//   NESSUNA "aggiungi" · INVIATA "in attesa" + "ritira" · RICEVUTA "accetta" / "rifiuta"
//   AMICI "chat" · NON_DISPONIBILE nessun pulsante
// Passo 1: il componente con i suoi dati e lo stato scritto; le azioni arrivano nei passi successivi.
export function PulsanteAmicizia({ statoAmicizia }: PulsanteAmiciziaProps) {
  const etichetta = ETICHETTE[statoAmicizia]
  if (!etichetta) return null

  return (
    <div className="flex shrink-0 items-center gap-space-xs">
      <span className={`font-label-code-status text-label-code-status uppercase ${etichetta.colore}`}>{etichetta.testo}</span>
    </div>
  )
}
