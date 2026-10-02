import { Avatar } from '@/components/ui'
import type { UtentePubblicoResponse } from '@/types/api'
import { useAmicoOnline } from './presenza'

type AvatarAmicoProps = {
  amico: UtentePubblicoResponse
  /** Anello del pallino, del colore dello sfondo dietro l'avatar (es. "ring-surface-container") */
  anello?: string
}

// Avatar di un amico con il pallino "online" (card "Extra: pallino online sugli avatar degli amici"),
// come nella schermata Stitch "Community, Amicizie & Chat Live". Un account non piu' attivo resta
// attenuato e non risulta mai online.
export function AvatarAmico({ amico, anello }: AvatarAmicoProps) {
  const online = useAmicoOnline(amico.id)
  return <Avatar utente={amico} online={amico.attivo && online} anello={anello} className={amico.attivo ? undefined : 'opacity-60'} />
}
