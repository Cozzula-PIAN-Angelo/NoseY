import { Link } from 'react-router'
import { Icon, useAvviso } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { NotificaResponse } from '@/types/api'
import { useSegnaNotificaLettaMutation } from './apiSocial'
import { aspettoNotifica, CATEGORIE_NOTIFICA, linkNotifica } from './notifiche'
import { quandoBreve } from './tempiChat'

// Una notifica (FE2-13), come le righe del pannello "Notifiche Feed" della schermata Stitch
// "Community, Amicizie & Chat Live": icona colorata per categoria, testo, quando e, in oro, il
// pallino delle non lette. Il clic apre la pagina a cui si riferisce (evento, amici, chat) e la
// segna letta (SegnaNotificaLetta). Per le chat la segna gia' la conversazione aprendosi
// (SegnaChatLetta, che per il backend e' la stessa cosa).

const dataCompleta = new Intl.DateTimeFormat('it-IT', { dateStyle: 'full', timeStyle: 'short' })

export function RigaNotifica({ notifica: n }: { notifica: NotificaResponse }) {
  const [segnaLetta] = useSegnaNotificaLettaMutation()
  const avviso = useAvviso()
  const { colore } = CATEGORIE_NOTIFICA[n.categoria]
  const { icona } = aspettoNotifica(n)

  function apri() {
    if (n.letta || n.categoria === 'chats') return
    segnaLetta({ categoria: n.categoria, notificaId: n.id }).unwrap().catch(avviso.erroreApi)
  }

  return (
    <li>
      <Link
        to={linkNotifica(n)}
        onClick={apri}
        className={cx(
          'group flex items-start gap-space-sm rounded-lg p-space-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
          n.letta ? 'hover:bg-surface-container-low' : 'bg-surface-container-low hover:bg-surface-container',
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container">
          <Icon nome={icona} size={20} className={colore} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p
            className={cx(
              'font-body-md text-body-md break-words transition-colors group-hover:text-on-surface',
              n.letta ? 'text-on-surface-variant' : 'text-on-surface',
            )}
          >
            {n.testo}
          </p>
          <time
            dateTime={n.creataIl}
            title={dataCompleta.format(new Date(n.creataIl))}
            className={cx(
              'font-label-code-status text-[10px]',
              n.letta ? 'text-outline' : 'text-accent-gold-piercing',
            )}
          >
            {quandoBreve(n.creataIl)}
          </time>
        </div>
        {!n.letta && (
          <span className="mt-2 flex size-2.5 shrink-0 rounded-full bg-accent-gold-piercing">
            <span className="sr-only">Non letta</span>
          </span>
        )}
      </Link>
    </li>
  )
}
