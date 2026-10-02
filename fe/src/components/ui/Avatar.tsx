import { urlImmagine } from '@/lib/api'
import { cx } from '@/lib/cx'

type AvatarProps = {
  utente: { nome: string; cognome: string; immagineProfilo: string | null }
  /** sm 32px · md 40px (default) */
  dimensione?: 'sm' | 'md'
  className?: string
  /** true = pallino verde "online" in basso a destra, con il testo "online" per gli screen reader */
  online?: boolean
  /**
   * Anello attorno al pallino, del colore dello sfondo dietro l'avatar (come in Stitch),
   * es. "ring-surface-container". Default ring-surface-card.
   */
  anello?: string
}

// Immagine del profilo, o le iniziali se manca. Decorativa (alt vuoto): il nome sta sempre accanto.
export function Avatar({ utente, dimensione = 'md', className, online = false, anello = 'ring-surface-card' }: AvatarProps) {
  const immagine = urlImmagine(utente.immagineProfilo)
  const misura = dimensione === 'sm' ? 'size-8' : 'size-10'
  const iniziali = `${utente.nome[0] ?? ''}${utente.cognome[0] ?? ''}`.toUpperCase()
  const figura = immagine ? (
    <img src={immagine} alt="" className={cx(misura, 'shrink-0 rounded-full object-cover', className)} />
  ) : (
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
  if (!online) return figura

  return (
    <span className="relative inline-flex shrink-0">
      {figura}
      <span
        aria-hidden="true"
        className={cx('absolute bottom-0 right-0 rounded-full bg-poi-ingresso ring-2', dimensione === 'sm' ? 'size-2.5' : 'size-3', anello)}
      />
      <span className="sr-only">online</span>
    </span>
  )
}
