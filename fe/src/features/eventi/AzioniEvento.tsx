import { Link } from 'react-router'
import { Button, Icon, stilePulsante } from '@/components/ui'
import type { EventoDettaglioResponse } from '@/types/api'

type AzioniEventoProps = {
  evento: EventoDettaglioResponse
  // Le azioni arrivano dalle card che le implementano: iscrizione e annullamento dell'iscrizione
  // (FE1-06), annullamento dell'evento (FE1-13). Senza la funzione il pulsante resta disattivato.
  onIscriviti?: () => void
  onAnnullaIscrizione?: () => void
  onAnnullaEvento?: () => void
  /** Un'azione e' in corso: rotellina sul pulsante */
  inCorso?: 'iscrizione' | 'annulla-iscrizione' | 'annulla-evento'
}

const nonAncora = 'Non ancora disponibile'

// Pulsanti della pagina dell'evento (FE1-05), in base a chi guarda e allo stato:
//   proprietario  → Modifica, Annulla evento (solo se PROGRAMMATO o IN_CORSO), Partecipanti
//   iscritto      → Il mio ticket (porta al ticket nella pagina), Annulla iscrizione (solo se PROGRAMMATO), Partecipanti
//   altri         → Iscriviti (solo se PROGRAMMATO o IN_CORSO)
export function AzioniEvento({ evento, onIscriviti, onAnnullaIscrizione, onAnnullaEvento, inCorso }: AzioniEventoProps) {
  const attivo = evento.stato === 'PROGRAMMATO' || evento.stato === 'IN_CORSO'
  const { sonoProprietario, sonoIscritto } = evento
  const partecipanti = `${evento.numeroPartecipanti} ${evento.numeroPartecipanti === 1 ? 'partecipante' : 'partecipanti'}`

  return (
    <div className="flex flex-col gap-space-sm">
      <p className="flex items-center gap-space-xs font-body-md text-body-md text-on-surface-variant">
        <Icon nome="group" size={20} className="text-tertiary" />
        {partecipanti}
      </p>

      {sonoProprietario && (
        <>
          <p className="flex items-center gap-space-xs font-label-sm text-label-sm text-primary">
            <Icon nome="verified" size={18} piena />
            Hai organizzato tu questo evento
          </p>
          {attivo && (
            <Link to={`/events/${evento.id}/edit`} className={stilePulsante({ pieno: true })}>
              <Icon nome="edit" size={18} />
              Modifica evento
            </Link>
          )}
        </>
      )}

      {sonoIscritto && (
        <>
          <p className="flex items-center gap-space-xs font-label-sm text-label-sm text-status-in-corso">
            <Icon nome="check_circle" size={18} piena />
            Hai il ticket per questo evento
          </p>
          <a href="#ticket" className={stilePulsante({ variant: attivo ? 'primary' : 'secondary', pieno: true })}>
            <Icon nome="confirmation_number" size={18} />
            Il mio ticket
          </a>
        </>
      )}

      {!sonoProprietario && !sonoIscritto && attivo && (
        <Button
          variant="gradient"
          size="lg"
          pieno
          icona="confirmation_number"
          onClick={onIscriviti}
          disabled={!onIscriviti}
          title={onIscriviti ? undefined : nonAncora}
          inCorso={inCorso === 'iscrizione'}
        >
          Iscriviti
        </Button>
      )}

      {(sonoProprietario || sonoIscritto) && (
        <Link to={`/events/${evento.id}/participants`} className={stilePulsante({ variant: 'secondary', pieno: true })}>
          <Icon nome="groups" size={18} />
          Vedi i partecipanti
        </Link>
      )}

      {/* Azioni irreversibili in fondo, in rosso */}
      {sonoIscritto && evento.stato === 'PROGRAMMATO' && (
        <Button
          variant="danger"
          size="sm"
          icona="event_busy"
          onClick={onAnnullaIscrizione}
          disabled={!onAnnullaIscrizione}
          title={onAnnullaIscrizione ? undefined : nonAncora}
          inCorso={inCorso === 'annulla-iscrizione'}
          className="self-start"
        >
          Annulla iscrizione
        </Button>
      )}
      {sonoProprietario && attivo && (
        <Button
          variant="danger"
          size="sm"
          icona="cancel"
          onClick={onAnnullaEvento}
          disabled={!onAnnullaEvento}
          title={onAnnullaEvento ? undefined : nonAncora}
          inCorso={inCorso === 'annulla-evento'}
          className="self-start"
        >
          Annulla evento
        </Button>
      )}

      {!attivo && !sonoProprietario && !sonoIscritto && (
        <p className="font-body-sm text-body-sm text-outline">
          {evento.stato === 'ANNULLATO' ? "Non ci si può più iscrivere: l'evento è annullato." : "Non ci si può più iscrivere: l'evento è concluso."}
        </p>
      )}
    </div>
  )
}
