import { useState, type FormEvent } from 'react'
import { Button, Icon, TextArea, useAvviso } from '@/components/ui'
import { leggiErrore } from '@/lib/errori'
import { LIMITI_EVENTI, type EventoDettaglioResponse } from '@/types/api'
import { useInviaNotificaManualeMutation } from './apiEventi'

// Notifica manuale ai partecipanti (FE1-13, passo 2), solo per chi ha organizzato l'evento e solo
// finche' e' in programma o in corso: un avviso (max 500 caratteri) che ogni iscritto riceve fra le
// notifiche. Il backend ne accetta al massimo 5 nelle ultime 24 ore per evento (finestra che scorre):
// oltre risponde 429 TROPPE_RICHIESTE e il testo resta nel campo, per inviarlo piu' tardi (passo 3).
export function NotificaPartecipanti({ evento }: { evento: EventoDettaglioResponse }) {
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState<string>()
  const [limiteRaggiunto, setLimiteRaggiunto] = useState(false)
  const [invia, { isLoading }] = useInviaNotificaManualeMutation()
  const avviso = useAvviso()

  const nessunIscritto = evento.numeroPartecipanti === 0
  const pronto = testo.trim() !== '' && !nessunIscritto

  async function inviaNotifica(e: FormEvent) {
    e.preventDefault()
    if (!pronto) return
    setErrore(undefined)
    setLimiteRaggiunto(false)
    try {
      const { inviate } = await invia({ id: evento.id, dati: { testo: testo.trim() } }).unwrap()
      avviso.successo(
        'Notifica inviata',
        inviate === 1 ? 'L’ha ricevuta la persona iscritta.' : `L’hanno ricevuta ${inviate} persone iscritte.`,
      )
      setTesto('')
    } catch (err) {
      const { codice, campi } = leggiErrore(err)
      if (codice === 'VALIDAZIONE' && campi.testo) setErrore(campi.testo)
      else if (codice === 'TROPPE_RICHIESTE') setLimiteRaggiunto(true)
      else avviso.erroreApi(err)
    }
  }

  return (
    <form onSubmit={inviaNotifica} noValidate className="flex flex-col gap-space-sm rounded-2xl bg-surface-card p-space-lg">
      <h2 className="flex items-center gap-space-xs font-headline-sm text-headline-sm">
        <Icon nome="campaign" size={22} className="text-secondary" />
        Avvisa i partecipanti
      </h2>
      <TextArea
        etichetta="Messaggio"
        obbligatorio
        rows={4}
        maxLength={LIMITI_EVENTI.testoNotificaManuale}
        value={testo}
        onChange={(e) => {
          setTesto(e.target.value)
          setErrore(undefined)
        }}
        errore={errore}
        disabled={isLoading || nessunIscritto}
        aiuto={
          nessunIscritto
            ? 'Potrai scrivere ai partecipanti quando qualcuno si sarà iscritto.'
            : `Arriva fra le notifiche di ${evento.numeroPartecipanti === 1 ? 'chi è iscritto' : `tutte le ${evento.numeroPartecipanti} persone iscritte`}. Al massimo ${LIMITI_EVENTI.notificheManualiAlGiorno} ogni 24 ore.`
        }
        placeholder="Es. le porte aprono alle 21: portate il ticket sul telefono."
      />
      <Button type="submit" icona="send" disabled={!pronto} inCorso={isLoading} className="self-start">
        Invia la notifica
      </Button>
      {limiteRaggiunto && (
        <p role="alert" className="flex items-start gap-1.5 rounded-xl bg-tertiary/10 p-space-sm font-body-sm text-body-sm text-on-surface">
          <Icon nome="schedule" size={18} className="mt-0.5 shrink-0 text-tertiary" />
          <span>
            Hai già inviato {LIMITI_EVENTI.notificheManualiAlGiorno} notifiche per questo evento nelle ultime 24 ore. Il
            messaggio resta qui: potrai inviarlo più tardi.
          </span>
        </p>
      )}
    </form>
  )
}
