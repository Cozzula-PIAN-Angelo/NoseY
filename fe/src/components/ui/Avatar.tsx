import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'

type AvatarProps = {
  utente: { nome: string; cognome: string; immagineProfilo: string | null }
  /** sm 32px · md 40px (default) */
  dimensione?: 'sm' | 'md'
  className?: string
}

// Immagine del profilo, o le iniziali se manca. Decorativa (alt vuoto): il nome sta sempre accanto.
export function Avatar({ utente, dimensione = 'md', className }: AvatarProps) {
  const immagine = urlImmagine(utente.immagineProfilo)
  const misura = dimensione === 'sm' ? 'size-8' : 'size-10'
  if (immagine) return <img src={immagine} alt="" className={cx(misura, 'shrink-0 rounded-full object-cover', className)} />
  const iniziali = `${utente.nome[0] ?? ''}${utente.cognome[0] ?? ''}`.toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={cx(
        misura,
        'flex shrink-0 items-center justify-center rounded-full bg-surface-container-high font-label-btn text-label-btn text-primary',
        className,
      )}
    >
      {iniziali}
    </span>
  )
}
