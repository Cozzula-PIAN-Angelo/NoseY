import { useState } from 'react'
import { ConfirmDialog, TextArea, useAvviso } from '@/components/ui'
import { leggiErrore } from '@/lib/errori'
import { LIMITI_EVENTI, type EventoDettaglioResponse } from '@/types/api'
import { useAnnullaEventoMutation } from './apiEventi'

type AnnullaEventoProps = {
  evento: EventoDettaglioResponse
  aperta: boolean
  onChiudi: () => void
}

// Annullamento dell'evento (FE1-13, passo 1): finestra di conferma con il motivo facoltativo
// (max 500 caratteri), che arriva ai partecipanti nella notifica e resta nella pagina dell'evento.
// Irreversibile: l'evento sparisce dalla mappa ma resta visibile nel dettaglio e nei ticket.
export function AnnullaEvento({ evento, aperta, onChiudi }: AnnullaEventoProps) {
  const [motivo, setMotivo] = useState('')
  const [errore, setErrore] = useState<string>()
  const [annulla, { isLoading }] = useAnnullaEventoMutation()
  const avviso = useAvviso()

  function chiudi() {
    setMotivo('')
    setErrore(undefined)
    onChiudi()
  }

  async function conferma() {
    setErrore(undefined)
    const testo = motivo.trim()
    try {
      await annulla({ id: evento.id, dati: testo ? { motivo: testo } : undefined }).unwrap()
      avviso.info('Evento annullato', 'I partecipanti ricevono una notifica. L’evento non compare più sulla mappa.')
      chiudi()
    } catch (err) {
      const { codice, campi } = leggiErrore(err)
      if (codice === 'VALIDAZIONE' && campi.motivo) {
        setErrore(campi.motivo)
      } else {
        // EVENTO_CONCLUSO / EVENTO_ANNULLATO: la pagina si ricarica da sola e mostra lo stato vero
        avviso.erroreApi(err)
        if (codice === 'EVENTO_CONCLUSO' || codice === 'EVENTO_ANNULLATO') chiudi()
      }
    }
  }

  const partecipanti = evento.numeroPartecipanti

  return (
    <ConfirmDialog
      aperta={aperta}
      titolo="Annullare l'evento?"
      icona="cancel"
      variante="danger"
      testoConferma="Annulla l'evento"
      testoAnnulla="Non annullare"
      inCorso={isLoading}
      onConferma={conferma}
      onAnnulla={chiudi}
    >
      <div className="flex flex-col gap-space-md">
        <p className="font-body-md text-body-md">
          «{evento.titolo}» verrà annullato <strong className="text-on-surface">per sempre</strong>: non si potrà
          riattivare né modificare.{' '}
          {partecipanti > 0
            ? `${partecipanti === 1 ? 'La persona iscritta riceve' : `Le ${partecipanti} persone iscritte ricevono`} una notifica.`
            : 'Non ci sono ancora persone iscritte.'}
        </p>
        <TextArea
          etichetta="Motivo (facoltativo)"
          aiuto="Lo leggono i partecipanti nella notifica e nella pagina dell'evento."
          rows={3}
          maxLength={LIMITI_EVENTI.motivoAnnullamento}
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value)
            setErrore(undefined)
          }}
          errore={errore}
          disabled={isLoading}
          placeholder="Es. maltempo, problemi con il locale..."
        />
      </div>
    </ConfirmDialog>
  )
}
