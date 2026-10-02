import { useCallback, useEffect, useRef, useState } from 'react'
import { useAvviso } from '@/components/ui'
import { leggiArchivio, salvaArchivio, type Archivio } from './archivio'
import { aggiungiRisposta, creaSegnalazione, prossimoEvento, risposteArrivateTra } from './sequenza'
import type { NuovaSegnalazione, Segnalazione } from './tipi'

/** Ogni quanto aggiornare comunque "ora", per i tempi relativi ("3 MIN FA") */
const AGGIORNA_OGNI = 30_000

// Segnalazioni della Modalita' Ragnatela: archivio nel localStorage e orologio della sequenza.
// Un solo timer, puntato sul prossimo evento (Spider-Man inizia a scrivere o un messaggio arriva).
// Le risposte arrivate mentre la pagina e' aperta mostrano l'avviso "Spider-Man ti ha risposto";
// quelle gia' dovute al caricamento (es. dopo un refresh) compaiono senza avviso.
export function useSegnalazioni() {
  const avviso = useAvviso()
  const [archivio, setArchivio] = useState<Archivio>(leggiArchivio)
  const [ora, setOra] = useState(() => Date.now())
  /** Fin dove sono gia' stati mostrati gli avvisi */
  const avvisatoFino = useRef(ora)
  const segnalazioniCorrenti = useRef(archivio.segnalazioni)
  useEffect(() => {
    segnalazioniCorrenti.current = archivio.segnalazioni
  }, [archivio.segnalazioni])

  const aggiorna = useCallback(() => {
    const adesso = Date.now()
    for (const s of risposteArrivateTra(segnalazioniCorrenti.current, avvisatoFino.current, adesso)) {
      avviso.info('Spider-Man ti ha risposto', s.titolo)
    }
    avvisatoFino.current = Math.max(avvisatoFino.current, adesso)
    setOra(adesso)
  }, [avviso])

  useEffect(() => salvaArchivio(archivio), [archivio])

  // Timer sul prossimo evento della sequenza
  useEffect(() => {
    const prossimo = prossimoEvento(archivio.segnalazioni, ora)
    if (prossimo === null) return
    const timer = setTimeout(aggiorna, Math.max(0, prossimo - Date.now()) + 20)
    return () => clearTimeout(timer)
  }, [archivio.segnalazioni, ora, aggiorna])

  useEffect(() => {
    const intervallo = setInterval(aggiorna, AGGIORNA_OGNI)
    return () => clearInterval(intervallo)
  }, [aggiorna])

  const crea = useCallback((dati: NuovaSegnalazione): Segnalazione => {
    const adesso = Date.now()
    const { archivio: nuovo, nuova } = creaSegnalazione(archivio, dati, adesso)
    setArchivio(nuovo)
    setOra(adesso)
    return nuova
  }, [archivio])

  const rispondi = useCallback((id: string, testo: string) => {
    const adesso = Date.now()
    setArchivio((a) => aggiungiRisposta(a, id, testo, adesso))
    setOra(adesso)
  }, [])

  return { segnalazioni: archivio.segnalazioni, ora, crea, rispondi }
}
