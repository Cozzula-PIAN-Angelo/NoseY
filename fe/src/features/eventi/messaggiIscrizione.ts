import type { CodiceErrore } from '@/lib/codiciErrore'
import type { TipoAvviso } from '@/store/avvisiSlice'

// Messaggi degli errori dell'iscrizione e del suo annullamento (FE1-06, passo 4).
// I testi generici di codiciErrore.ts parlano di "modificare l'evento": qui servono frasi
// pensate per chi si iscrive. Dopo l'errore la pagina si aggiorna da sola (RTK Query invalida
// le etichette della cache anche quando la mutation fallisce), quindi il messaggio puo' dire
// cosa si vede adesso.

export type AzioneIscrizione = 'iscrizione' | 'annullamento'

type Messaggio = { tipo: TipoAvviso; titolo: string; messaggio: string }

const perIscrizione: Partial<Record<CodiceErrore, Messaggio>> = {
  GIA_ISCRITTO: {
    tipo: 'info',
    titolo: 'Hai già il ticket',
    messaggio: 'Il ticket per questo evento c’era già: lo trovi qui nella pagina.',
  },
  PROPRIETARIO_NON_ISCRIVIBILE: {
    tipo: 'info',
    titolo: 'Hai organizzato tu l’evento',
    messaggio: 'Non serve iscriverti a un evento che hai creato tu.',
  },
  EVENTO_CONCLUSO: {
    tipo: 'attenzione',
    titolo: 'Evento concluso',
    messaggio: 'L’evento è terminato nel frattempo: non ci si può più iscrivere.',
  },
  EVENTO_ANNULLATO: {
    tipo: 'attenzione',
    titolo: 'Evento annullato',
    messaggio: 'L’organizzatore ha annullato l’evento: non ci si può più iscrivere.',
  },
}

const perAnnullamento: Partial<Record<CodiceErrore, Messaggio>> = {
  EVENTO_GIA_INIZIATO: {
    tipo: 'attenzione',
    titolo: 'Evento già iniziato',
    messaggio: 'L’iscrizione si può annullare solo prima dell’inizio: il tuo ticket resta valido.',
  },
  EVENTO_CONCLUSO: {
    tipo: 'attenzione',
    titolo: 'Evento concluso',
    messaggio: 'L’evento è terminato: l’iscrizione non si può più annullare.',
  },
  EVENTO_ANNULLATO: {
    tipo: 'info',
    titolo: 'Evento annullato',
    messaggio: 'L’organizzatore ha già annullato l’evento: non devi fare nulla.',
  },
  NON_TROVATO: {
    tipo: 'info',
    titolo: 'Nessuna iscrizione da annullare',
    messaggio: 'L’iscrizione era già stata annullata.',
  },
}

/** Messaggio specifico per il codice, oppure null: in quel caso si usa il testo generico */
export function messaggioIscrizione(codice: CodiceErrore | undefined, azione: AzioneIscrizione): Messaggio | null {
  if (!codice) return null
  return (azione === 'iscrizione' ? perIscrizione : perAnnullamento)[codice] ?? null
}
