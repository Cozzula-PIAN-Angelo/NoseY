// Come si mostrano le notifiche (FE2-13, progettazione v4 sezione 10): colore per categoria, come le
// righe del pannello "Notifiche Feed" della schermata Stitch "Community, Amicizie & Chat Live",
// icona e titolo breve per tipo (righe e avvisi a comparsa) e pagina che la notifica apre.
import type { TipoAvviso } from '@/store/avvisiSlice'
import type { CategoriaNotifica, NotificaResponse } from '@/types/api'

export const CATEGORIE_NOTIFICA: Record<CategoriaNotifica, { etichetta: string; icona: string; colore: string }> = {
  events: { etichetta: 'Eventi', icona: 'event', colore: 'text-poi-uscita' },
  friendships: { etichetta: 'Amicizie', icona: 'person_add', colore: 'text-primary' },
  chats: { etichetta: 'Chat', icona: 'chat', colore: 'text-poi-ingresso' },
}

/**
 * Icona della riga e titolo dell'avviso a comparsa di una notifica live (il testo della notifica
 * va sotto il titolo), secondo il tipo
 */
export function aspettoNotifica(n: NotificaResponse): { icona: string; titolo: string; avviso: TipoAvviso } {
  switch (n.tipo) {
    case 'MODIFICA':
      return { icona: 'edit_calendar', titolo: 'Evento modificato', avviso: 'info' }
    case 'MANUALE':
      return { icona: 'campaign', titolo: 'Messaggio dall’organizzatore', avviso: 'info' }
    case 'ISCRIZIONE':
      return { icona: 'how_to_reg', titolo: 'Nuove iscrizioni', avviso: 'info' }
    case 'ANNULLAMENTO':
      return { icona: 'event_busy', titolo: 'Evento annullato', avviso: 'attenzione' }
    case 'MODERAZIONE':
      return { icona: 'gavel', titolo: 'Moderazione', avviso: 'attenzione' }
    case 'RICHIESTA':
      return { icona: 'person_add', titolo: 'Richiesta d’amicizia', avviso: 'info' }
    case 'ACCETTATA':
      return { icona: 'handshake', titolo: 'Amicizia accettata', avviso: 'successo' }
    case 'NUOVI_MESSAGGI':
      return { icona: 'chat', titolo: 'Nuovi messaggi', avviso: 'info' }
  }
}

/** Pagina aperta dalla notifica: l'evento, le richieste ricevute o gli amici, la chat */
export function linkNotifica(n: NotificaResponse): string {
  switch (n.categoria) {
    case 'events':
      return `/events/${n.riferimentoId}`
    case 'friendships':
      return n.tipo === 'RICHIESTA' ? '/friends?tab=requests' : '/friends'
    case 'chats':
      return `/chat/${n.riferimentoId}`
  }
}
