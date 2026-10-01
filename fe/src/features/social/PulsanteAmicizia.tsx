import { Link } from 'react-router'
import { Button, Icon, stilePulsante, useAvviso } from '@/components/ui'
import type { StatoAmicizia, UtentePubblicoResponse, Uuid } from '@/types/api'
import {
  useAccettaAmiciziaMutation,
  useRichiediAmiciziaMutation,
  useRifiutaAmiciziaMutation,
  useRitiraRichiestaMutation,
} from './apiSocial'

export type PulsanteAmiciziaProps = {
  /** L'altra persona (nome per le etichette accessibili, attivo per disattivare il pulsante) */
  utente: UtentePubblicoResponse
  /** Stato visto da chi guarda, come arriva da ListaPartecipanti */
  statoAmicizia: StatoAmicizia
  /** Valorizzato con INVIATA, RICEVUTA e AMICI: serve per ritirare, accettare e rifiutare */
  amiciziaId: Uuid | null
  /** Evento in comune: la richiesta parte sempre da un evento (RichiediAmicizia) */
  eventoId: Uuid
  /** Chat della coppia (decisione 20): con AMICI c'e' sempre, apre /chat/:chatId */
  chatId: Uuid | null
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
// Dopo ogni azione apiSocial ricarica le liste dei partecipanti: lo stato nuovo arriva da li'.
export function PulsanteAmicizia({ utente, statoAmicizia, amiciziaId, eventoId, chatId }: PulsanteAmiciziaProps) {
  const [richiedi, { isLoading: richiesta }] = useRichiediAmiciziaMutation()
  const [ritira, { isLoading: ritiro }] = useRitiraRichiestaMutation()
  const [accetta, { isLoading: accettazione }] = useAccettaAmiciziaMutation()
  const [rifiuta, { isLoading: rifiuto }] = useRifiutaAmiciziaMutation()
  const avviso = useAvviso()
  const nome = `${utente.nome} ${utente.cognome}`
  const occupato = richiesta || ritiro || accettazione || rifiuto
  const etichetta = ETICHETTE[statoAmicizia]

  async function esegui(azione: () => Promise<unknown>, riuscita: () => void) {
    try {
      await azione()
      riuscita()
    } catch (err) {
      avviso.erroreApi(err)
    }
  }

  const aggiungi = () =>
    esegui(
      () => richiedi({ riceventeId: utente.id, eventoId }).unwrap(),
      () => avviso.successo('Richiesta inviata', `Se ${nome} accetta, potrete scrivervi in chat.`),
    )

  const ritiraRichiesta = () =>
    amiciziaId &&
    esegui(
      () => ritira(amiciziaId).unwrap(),
      () => avviso.info('Richiesta ritirata', `Potrai chiedere di nuovo l’amicizia a ${nome}.`),
    )

  const accettaRichiesta = () =>
    amiciziaId &&
    esegui(
      () => accetta(amiciziaId).unwrap(),
      () => avviso.successo('Ora siete amici', `Puoi scrivere a ${nome} in chat.`),
    )

  const rifiutaRichiesta = () =>
    amiciziaId &&
    esegui(
      () => rifiuta(amiciziaId).unwrap(),
      // Chi l'ha chiesta non lo scopre: per chi l'ha inviata resta "in attesa"
      () => avviso.info('Richiesta rifiutata', `${nome} non riceve nessun avviso.`),
    )

  if (statoAmicizia === 'NESSUNA') {
    return (
      <Button size="sm" icona="person_add" onClick={aggiungi} inCorso={richiesta} aria-label={`Aggiungi ${nome} agli amici`}>
        Aggiungi
      </Button>
    )
  }

  // NON_DISPONIBILE: nessun pulsante e nessuno stato scritto
  if (!etichetta) return null

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-space-xs">
      <span className={`font-label-code-status text-label-code-status uppercase ${etichetta.colore}`}>{etichetta.testo}</span>
      {statoAmicizia === 'INVIATA' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={ritiraRichiesta}
          inCorso={ritiro}
          disabled={!amiciziaId}
          aria-label={`Ritira la richiesta di amicizia a ${nome}`}
        >
          Ritira
        </Button>
      )}
      {statoAmicizia === 'RICEVUTA' && (
        <>
          <Button
            size="sm"
            icona="check"
            onClick={accettaRichiesta}
            inCorso={accettazione}
            disabled={!amiciziaId || (occupato && !accettazione)}
            aria-label={`Accetta la richiesta di amicizia di ${nome}`}
          >
            Accetta
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={rifiutaRichiesta}
            inCorso={rifiuto}
            disabled={!amiciziaId || (occupato && !rifiuto)}
            aria-label={`Rifiuta la richiesta di amicizia di ${nome}`}
          >
            Rifiuta
          </Button>
        </>
      )}
      {statoAmicizia === 'AMICI' && (
        <Link
          to={chatId ? `/chat/${chatId}` : '/chat'}
          className={stilePulsante({ variant: 'secondary', size: 'sm' })}
          aria-label={`Apri la chat con ${nome}`}
        >
          <Icon nome="chat" size={16} />
          Chat
        </Link>
      )}
    </div>
  )
}
