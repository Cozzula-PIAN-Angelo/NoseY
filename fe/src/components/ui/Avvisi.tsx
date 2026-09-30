import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { cx } from '@/lib/cx'
import { chiudiAvviso, mostraAvviso, type Avviso, type TipoAvviso } from '@/store/avvisiSlice'
import { Icon } from './Icon'

const stile: Record<TipoAvviso, { icona: string; colore: string }> = {
  successo: { icona: 'check_circle', colore: 'text-poi-ingresso' },
  errore: { icona: 'error', colore: 'text-status-annullato' },
  info: { icona: 'info', colore: 'text-secondary' },
  attenzione: { icona: 'warning', colore: 'text-accent-gold-piercing' },
}

// Mostra un avviso a comparsa da qualunque componente:
//   const avviso = useAvviso()
//   avviso.successo('Iscrizione completata', 'Trovi il ticket in I Miei Ticket')
export function useAvviso() {
  const dispatch = useAppDispatch()
  return useMemo(() => {
    const crea = (tipo: TipoAvviso) => (titolo: string, messaggio?: string, durata?: number) =>
      dispatch(mostraAvviso({ tipo, titolo, messaggio, durata }))
    return {
      successo: crea('successo'),
      errore: crea('errore'),
      info: crea('info'),
      attenzione: crea('attenzione'),
    }
  }, [dispatch])
}

function ElementoAvviso({ avviso }: { avviso: Avviso }) {
  const dispatch = useAppDispatch()
  const { icona, colore } = stile[avviso.tipo]

  useEffect(() => {
    if (avviso.durata <= 0) return
    const timer = setTimeout(() => dispatch(chiudiAvviso(avviso.id)), avviso.durata)
    return () => clearTimeout(timer)
  }, [avviso.id, avviso.durata, dispatch])

  return (
    <div
      // Gli errori interrompono lo screen reader, gli altri aspettano che finisca di leggere
      role={avviso.tipo === 'errore' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-start gap-space-sm rounded-xl bg-surface-card px-space-md py-space-sm text-on-surface shadow-2xl motion-safe:animate-[entrata-avviso_200ms_ease-out]"
    >
      <Icon nome={icona} size={22} className={cx('mt-0.5', colore)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-label-sm text-label-sm font-semibold">{avviso.titolo}</span>
        {avviso.messaggio && (
          <span className="font-body-sm text-body-sm text-on-surface-variant">{avviso.messaggio}</span>
        )}
      </div>
      <button
        type="button"
        aria-label="Chiudi avviso"
        onClick={() => dispatch(chiudiAvviso(avviso.id))}
        className="-mr-1 rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <Icon nome="close" size={18} />
      </button>
    </div>
  )
}

// Contenitore degli avvisi: va messo UNA volta sola, in App.
export function Avvisi() {
  const avvisi = useAppSelector((s) => s.avvisi)

  return (
    <div className="pointer-events-none fixed inset-x-space-md bottom-space-md z-50 flex flex-col items-end gap-space-sm sm:inset-x-auto sm:right-space-lg sm:bottom-space-lg sm:w-96">
      {avvisi.map((a) => (
        <ElementoAvviso key={a.id} avviso={a} />
      ))}
    </div>
  )
}
