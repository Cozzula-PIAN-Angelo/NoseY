import { useState } from 'react'
import { Button, ConfirmDialog, Icon, TextArea, useAvviso } from '@/components/ui'
import { urlImmagine } from '@/lib/api'
import { leggiErrore } from '@/lib/errori'
import { LIMITI_EVENTI, type EventoDettaglioResponse, type FotoResponse } from '@/types/api'
import { useAnnullaEventoModerazioneMutation, useRimuoviFotoModerazioneMutation } from './apiAdmin'

// Moderazione di un evento (FE1-16, passo 3), nella pagina dell'evento per ADMIN e SUPERADMIN che non
// lo hanno organizzato: rimozione di una foto (anche su eventi conclusi o annullati) e annullamento
// con motivo obbligatorio. Il backend avvisa chi organizza (MODERAZIONE) e chi partecipa (ANNULLAMENTO).
// Gli eventi di un ruolo uguale o superiore al proprio non si moderano: 403 RUOLO_INSUFFICIENTE.
export function ModerazioneEvento({ evento }: { evento: EventoDettaglioResponse }) {
  const [fotoDaRimuovere, setFotoDaRimuovere] = useState<FotoResponse | null>(null)
  const [annullaAperta, setAnnullaAperta] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erroreMotivo, setErroreMotivo] = useState<string>()
  const [rimuovi, { isLoading: rimozione }] = useRimuoviFotoModerazioneMutation()
  const [annulla, { isLoading: annullamento }] = useAnnullaEventoModerazioneMutation()
  const avviso = useAvviso()
  const attivo = evento.stato === 'PROGRAMMATO' || evento.stato === 'IN_CORSO'

  /** RUOLO_INSUFFICIENTE con un messaggio chiaro; il resto con il testo del codice */
  function mostraErrore(err: unknown) {
    if (leggiErrore(err).codice === 'RUOLO_INSUFFICIENTE') {
      avviso.attenzione('Moderazione non consentita', 'L’evento è di un account con un ruolo uguale o superiore al tuo.')
    } else {
      avviso.erroreApi(err)
    }
  }

  async function confermaRimozione() {
    if (!fotoDaRimuovere) return
    try {
      await rimuovi({ id: evento.id, fotoId: fotoDaRimuovere.id }).unwrap()
      avviso.info('Foto rimossa', 'Chi organizza l’evento riceve una notifica della moderazione.')
    } catch (err) {
      mostraErrore(err)
    }
    setFotoDaRimuovere(null)
  }

  function chiudiAnnulla() {
    setAnnullaAperta(false)
    setMotivo('')
    setErroreMotivo(undefined)
  }

  async function confermaAnnullamento() {
    const testo = motivo.trim()
    if (!testo) return setErroreMotivo('Scrivi il motivo: lo leggono chi organizza e chi partecipa.')
    try {
      await annulla({ id: evento.id, dati: { motivo: testo } }).unwrap()
      avviso.info('Evento annullato', 'Chi organizza e chi partecipa ricevono una notifica con il motivo.')
      chiudiAnnulla()
    } catch (err) {
      const { codice, campi } = leggiErrore(err)
      if (codice === 'VALIDAZIONE' && campi.motivo) setErroreMotivo(campi.motivo)
      else {
        mostraErrore(err)
        chiudiAnnulla()
      }
    }
  }

  return (
    <section aria-labelledby="titolo-moderazione" className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-lg ring-1 ring-accent-gold-piercing/30">
      <h2 id="titolo-moderazione" className="flex items-center gap-space-xs font-headline-sm text-headline-sm">
        <Icon nome="shield_person" size={22} className="text-accent-gold-piercing" />
        Moderazione
      </h2>

      <div className="flex flex-col gap-space-xs">
        <p className="font-label-code-status text-label-code-status uppercase text-outline">Foto dell'evento</p>
        {evento.foto.length === 0 ? (
          <p className="font-body-sm text-body-sm text-outline">L'evento non ha foto.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-space-xs">
            {evento.foto.map((f, i) => (
              <li key={f.id} className="relative">
                <img src={urlImmagine(f.url) ?? undefined} alt={f.didascalia || `Foto ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setFotoDaRimuovere(f)}
                  aria-label={`Rimuovi la foto ${i + 1}${f.didascalia ? `: ${f.didascalia}` : ''}`}
                  className="absolute right-1 top-1 rounded-full bg-surface-canvas/85 p-1 text-status-annullato transition-colors hover:bg-status-annullato hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                >
                  <Icon nome="delete" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {attivo && (
        <Button variant="danger" size="sm" icona="gavel" onClick={() => setAnnullaAperta(true)} className="self-start">
          Annulla per moderazione
        </Button>
      )}

      <ConfirmDialog
        aperta={fotoDaRimuovere !== null}
        titolo="Rimuovere la foto?"
        icona="hide_image"
        variante="danger"
        testoConferma="Rimuovi"
        testoAnnulla="Annulla"
        inCorso={rimozione}
        onConferma={confermaRimozione}
        onAnnulla={() => setFotoDaRimuovere(null)}
      >
        <p className="font-body-md text-body-md">
          La foto sparisce dall'evento per sempre e chi lo organizza riceve una notifica della moderazione. Se era la
          copertina, la sostituisce la foto più vecchia rimasta.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        aperta={annullaAperta}
        titolo="Annullare l'evento per moderazione?"
        icona="gavel"
        variante="danger"
        testoConferma="Annulla l'evento"
        testoAnnulla="Non annullare"
        inCorso={annullamento}
        onConferma={confermaAnnullamento}
        onAnnulla={chiudiAnnulla}
      >
        <div className="flex flex-col gap-space-md">
          <p className="font-body-md text-body-md">
            «{evento.titolo}» verrà annullato <strong className="text-on-surface">per sempre</strong>. Chi lo organizza e
            chi partecipa ricevono una notifica con il motivo.
          </p>
          <TextArea
            etichetta="Motivo"
            obbligatorio
            rows={3}
            maxLength={LIMITI_EVENTI.motivoAnnullamento}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value)
              setErroreMotivo(undefined)
            }}
            errore={erroreMotivo}
            disabled={annullamento}
            placeholder="Es. contenuti non adatti nella descrizione"
          />
        </div>
      </ConfirmDialog>
    </section>
  )
}
