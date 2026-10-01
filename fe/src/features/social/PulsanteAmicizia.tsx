import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Icon, stilePulsante, useAvviso } from '@/components/ui'
import { leggiErrore } from '@/lib/errori'
import { useAppDispatch } from '@/hooks/redux'
import type { StatoAmicizia, UtentePubblicoResponse, Uuid } from '@/types/api'
import {
  apiSocial,
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
  AMICI: { testo: 'Amicizia', colore: 'text-status-in-corso' },
}

// Pulsante amicizia (FE2-09), usato da FE1 nella lista dei partecipanti (FE1-14). Mostra l'azione
// giusta per statoAmicizia (progettazione v4, sezioni 7 e 8):
//   NESSUNA "aggiungi" · INVIATA "in attesa" + "ritira" · RICEVUTA "accetta" / "rifiuta"
//   AMICI "chat" · NON_DISPONIBILE nessun pulsante
// Dopo ogni azione apiSocial ricarica le liste dei partecipanti: lo stato nuovo arriva da li'.
// Con un account non piu' attivo (sospeso o anonimizzato) i pulsanti restano visibili ma disattivati,
// tranne "Chat": la chat resta leggibile, in sola lettura.
// Se lo stato ricevuto e' vecchio (l'altra persona ha fatto qualcosa nel frattempo):
//   RICHIESTA_GIA_RICEVUTA → la richiesta c'e' gia': si cerca fra le ricevute e si propone "accetta"
//   CONFLITTO (richieste incrociate nello stesso istante) → si ricarica lo stato dal backend
export function PulsanteAmicizia({ utente, statoAmicizia: statoDaProps, amiciziaId: idDaProps, eventoId, chatId }: PulsanteAmiciziaProps) {
  // Richiesta ricevuta scoperta con RICHIESTA_GIA_RICEVUTA: vale finche' i dati del genitore non
  // cambiano stato (dopo il ricaricamento arriva RICEVUTA anche da li')
  const [ricevuta, setRicevuta] = useState<{ perStato: StatoAmicizia; amiciziaId: Uuid } | null>(null)
  const scoperta = ricevuta?.perStato === statoDaProps ? ricevuta : null
  const statoAmicizia: StatoAmicizia = scoperta ? 'RICEVUTA' : statoDaProps
  const amiciziaId = scoperta ? scoperta.amiciziaId : idDaProps
  const [cercaRicevute] = apiSocial.endpoints.richiesteRicevute.useLazyQuery()
  const dispatch = useAppDispatch()
  const [richiedi, { isLoading: richiesta }] = useRichiediAmiciziaMutation()
  const [ritira, { isLoading: ritiro }] = useRitiraRichiestaMutation()
  const [accetta, { isLoading: accettazione }] = useAccettaAmiciziaMutation()
  const [rifiuta, { isLoading: rifiuto }] = useRifiutaAmiciziaMutation()
  const avviso = useAvviso()
  const nome = `${utente.nome} ${utente.cognome}`
  const occupato = richiesta || ritiro || accettazione || rifiuto
  const nonAttivo = !utente.attivo
  const motivo = nonAttivo ? 'Account non più attivo' : undefined
  const etichetta = ETICHETTE[statoAmicizia]

  async function esegui(azione: () => Promise<unknown>, riuscita: () => void) {
    try {
      await azione()
      riuscita()
    } catch (err) {
      avviso.erroreApi(err)
    }
  }

  async function aggiungi() {
    try {
      await richiedi({ riceventeId: utente.id, eventoId }).unwrap()
      avviso.successo('Richiesta inviata', `Se ${nome} accetta, potrete scrivervi in chat.`)
    } catch (err) {
      const { codice } = leggiErrore(err)
      if (codice === 'RICHIESTA_GIA_RICEVUTA') {
        // La sua richiesta e' gia' arrivata: si propone di accettarla qui, senza cambiare pagina
        const ricevute = await cercaRicevute().unwrap().catch(() => [])
        const sua = ricevute.find((a) => a.altroUtente.id === utente.id)
        if (sua) setRicevuta({ perStato: statoDaProps, amiciziaId: sua.id })
        avviso.info(`${nome} ti ha già chiesto l’amicizia`, 'Non serve inviarne un’altra: puoi accettare la sua richiesta.')
      } else if (codice === 'CONFLITTO') {
        // Le liste dei partecipanti si ricaricano gia' dopo la richiesta (apiSocial): qui si
        // forza anche il caso di un genitore con dati non in cache
        dispatch(apiSocial.util.invalidateTags(['Partecipanti', 'Amicizia']))
        avviso.info('Stato aggiornato', `Nel frattempo è cambiato qualcosa con ${nome}: ora vedi lo stato aggiornato.`)
      } else {
        avviso.erroreApi(err)
      }
    }
  }

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
      () => avviso.successo('Amicizia accettata', `Puoi scrivere a ${nome} in chat.`),
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
      <Button
        size="sm"
        icona="person_add"
        onClick={aggiungi}
        inCorso={richiesta}
        disabled={nonAttivo}
        title={motivo}
        aria-label={`Aggiungi ${nome} agli amici`}
      >
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
          disabled={!amiciziaId || nonAttivo}
          title={motivo}
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
            disabled={!amiciziaId || nonAttivo || (occupato && !accettazione)}
            title={motivo}
            aria-label={`Accetta la richiesta di amicizia di ${nome}`}
          >
            Accetta
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={rifiutaRichiesta}
            inCorso={rifiuto}
            disabled={!amiciziaId || nonAttivo || (occupato && !rifiuto)}
            title={motivo}
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
