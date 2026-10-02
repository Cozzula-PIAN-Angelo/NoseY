import { useAppSelector } from '@/hooks/redux'
import { selezionaToken } from '@/store/sessioneSlice'
import type { Uuid } from '@/types/api'
import { useAmiciOnlineQuery } from './apiSocial'

/**
 * L'amico e' collegato adesso? Per il pallino "online" sugli avatar (card "Extra: pallino online").
 * Una sola richiesta per tutta l'app (la cache di RTK Query e' condivisa), poi aggiornata live.
 * Senza accesso non chiede niente e risponde false.
 */
export function useAmicoOnline(utenteId: Uuid | null | undefined): boolean {
  const token = useAppSelector(selezionaToken)
  const { online } = useAmiciOnlineQuery(undefined, {
    skip: !token,
    selectFromResult: ({ data }) => ({ online: !!utenteId && !!data?.includes(utenteId) }),
  })
  return online
}
