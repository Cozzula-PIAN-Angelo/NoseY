import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar, Button, ConfirmDialog, Icon, useAvviso } from '@/components/ui'
import { useVediEventoQuery } from '@/features/eventi/apiEventi'
import type { AmiciziaResponse } from '@/types/api'
import { useRimuoviAmiciziaMutation } from './apiSocial'
import { PulsanteAmicizia } from './PulsanteAmicizia'

// Una riga delle liste di /friends (FE2-10): amici, richieste ricevute e inviate, come le righe della
// colonna "Social Radar" di Stitch. Le azioni sono quelle di PulsanteAmicizia (lo stato delle liste e'
// un sottoinsieme di StatoAmicizia); in piu', fra gli amici, "Rimuovi" con conferma.
// Dopo ogni azione apiSocial ricarica le tre liste: la riga passa da sola alla scheda giusta.

/** "Conosciuti a ...": il titolo arriva da VediEvento, una chiamata per evento, poi dalla cache */
function EventoInComune({ eventoId }: { eventoId: string }) {
  const { currentData: evento } = useVediEventoQuery(eventoId)
  return (
    <Link
      to={`/events/${eventoId}`}
      className="flex min-w-0 items-center gap-1 font-label-code-status text-label-code-status text-secondary hover:underline"
    >
      <Icon nome="nightlife" size={14} />
      <span className="truncate">{evento ? `Conosciuti a ${evento.titolo}` : 'Evento in cui vi siete conosciuti'}</span>
    </Link>
  )
}

export function RigaAmicizia({ amicizia }: { amicizia: AmiciziaResponse }) {
  const { id, altroUtente: utente, stato, eventoId, chatId } = amicizia
  const [conferma, setConferma] = useState(false)
  const [rimuovi, { isLoading: rimozione }] = useRimuoviAmiciziaMutation()
  const avviso = useAvviso()
  const nome = `${utente.nome} ${utente.cognome}`

  async function rimuoviAmicizia() {
    try {
      await rimuovi(id).unwrap()
      setConferma(false)
      avviso.info('Amicizia rimossa', `La chat con ${nome} resta leggibile, ma non potrete più scrivervi.`)
    } catch (err) {
      setConferma(false)
      avviso.erroreApi(err)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
      <div className="flex min-w-0 flex-1 items-center gap-space-sm">
        <Avatar utente={utente} className={utente.attivo ? undefined : 'opacity-60'} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-label-btn text-label-btn text-on-surface">{nome}</span>
          {!utente.attivo && (
            <span className="font-label-code-status text-label-code-status uppercase text-outline">Account non più attivo</span>
          )}
          <EventoInComune eventoId={eventoId} />
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-space-xs">
        <PulsanteAmicizia utente={utente} statoAmicizia={stato} amiciziaId={id} eventoId={eventoId} chatId={chatId} />
        {stato === 'AMICI' && (
          <Button
            variant="ghost"
            size="sm"
            icona="person_remove"
            onClick={() => setConferma(true)}
            aria-label={`Rimuovi ${nome} dagli amici`}
          >
            Rimuovi
          </Button>
        )}
      </div>
      {stato === 'AMICI' && (
        <ConfirmDialog
          aperta={conferma}
          titolo={`Rimuovere ${nome} dagli amici?`}
          variante="danger"
          icona="person_remove"
          testoConferma="Rimuovi"
          inCorso={rimozione}
          onConferma={rimuoviAmicizia}
          onAnnulla={() => setConferma(false)}
        >
          La chat resta leggibile ma nessuno dei due potrà più scrivere. {nome} non riceve nessun avviso e non
          potrà chiederti di nuovo l’amicizia; tu invece potrai farlo da un evento in comune.
        </ConfirmDialog>
      )}
    </li>
  )
}
