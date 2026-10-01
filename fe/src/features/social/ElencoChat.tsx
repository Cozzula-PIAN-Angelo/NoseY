import { Link } from 'react-router'
import { Avatar, Icon } from '@/components/ui'
import { useSessione } from '@/hooks/useSessione'
import { cx } from '@/lib/cx'
import type { ChatResponse, Uuid } from '@/types/api'
import { quandoBreve } from './tempiChat'

// Elenco delle chat (FE2-12), come le righe della colonna "Social Radar" della schermata Stitch
// "Community, Amicizie & Chat Live": avatar, nome, ora dell'ultimo messaggio, anteprima e, in oro,
// i messaggi non letti. Le chat in sola lettura restano, attenuate e col lucchetto.
// L'ordine e' quello di ListaChat (ultima attivita', decisione 16), aggiornato live dalla cache (apiSocial, listaChat).

type ElencoChatProps = {
  chat: ChatResponse[]
  /** Chat aperta, evidenziata */
  aperta?: Uuid
}

export function ElencoChat({ chat, aperta }: ElencoChatProps) {
  const io = useSessione().utente?.id
  return (
    <ul className="flex flex-col gap-1">
      {chat.map((c) => {
        const nome = `${c.amico.nome} ${c.amico.cognome}`
        const selezionata = c.id === aperta
        const ultimo = c.ultimoMessaggio
        return (
          <li key={c.id}>
            <Link
              to={`/chat/${c.id}`}
              aria-current={selezionata ? 'page' : undefined}
              className={cx(
                'group flex items-center gap-space-sm rounded-lg p-space-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
                selezionata ? 'bg-surface-container/90 shadow-sm' : 'hover:bg-surface-container-low',
              )}
            >
              <Avatar utente={c.amico} className={c.amico.attivo ? undefined : 'opacity-60'} />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-space-xs">
                  <span className="truncate font-label-btn text-label-btn text-on-surface transition-colors group-hover:text-primary">
                    {nome}
                  </span>
                  {ultimo && (
                    <time
                      dateTime={ultimo.inviatoIl}
                      className={cx(
                        'shrink-0 font-label-code-status text-[10px]',
                        c.nonLetti > 0 ? 'text-accent-gold-piercing' : 'text-on-surface-variant',
                      )}
                    >
                      {quandoBreve(ultimo.inviatoIl)}
                    </time>
                  )}
                </div>
                <div className="flex items-center justify-between gap-space-xs">
                  <p
                    className={cx(
                      'truncate font-body-sm text-body-sm',
                      c.nonLetti > 0 ? 'text-on-surface' : 'text-on-surface-variant',
                      !ultimo && 'italic',
                    )}
                  >
                    {ultimo ? `${ultimo.mittenteId === io ? 'Tu: ' : ''}${ultimo.testo}` : 'Nessun messaggio: scrivi per primo'}
                  </p>
                  {c.nonLetti > 0 && (
                    <span
                      aria-label={`${c.nonLetti} non letti`}
                      className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-gold-piercing px-1 font-label-code-status text-label-code-status font-bold text-on-tertiary-container"
                    >
                      {c.nonLetti > 99 ? '99+' : c.nonLetti}
                    </span>
                  )}
                </div>
                {!c.puoiScrivere && (
                  <span className="mt-1 flex items-center gap-1 font-label-code-status text-[10px] uppercase text-outline">
                    <Icon nome="lock" size={12} />
                    Sola lettura
                  </span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
