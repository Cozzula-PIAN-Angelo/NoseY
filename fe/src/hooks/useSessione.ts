import { useAppSelector } from '@/hooks/redux'
import { haRuolo, selezionaUtente } from '@/store/sessioneSlice'

// Chi ha fatto l'accesso, per mostrare o nascondere parti della pagina:
//   const { utente, loggato, admin } = useSessione()
//   {admin && <Button variant="danger">Annulla evento</Button>}
// Per proteggere un'intera pagina non serve: ci pensano le rotte (components/layout/Protezioni).
// Proprietario e iscrizione di un evento NON si ricavano da qui ma da sonoProprietario /
// sonoIscritto della risposta del backend.
export function useSessione() {
  const utente = useAppSelector(selezionaUtente)
  return {
    /** L'utente stesso (UtenteResponse), null per l'ospite */
    utente,
    loggato: utente !== null,
    /** ADMIN o SUPERADMIN */
    admin: haRuolo(utente, 'ADMIN'),
    superadmin: haRuolo(utente, 'SUPERADMIN'),
  }
}
