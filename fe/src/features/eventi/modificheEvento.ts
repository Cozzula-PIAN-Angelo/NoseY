import { istanteDaLocale, localeDaIstante } from '@/lib/date'
import type { EventoDettaglioResponse, ModificaEventoRequest } from '@/types/api'
import type { ValoriEvento } from './FormEvento'

// Modifica dell'evento (FE1-07, passo 3): la PATCH contiene SOLO i campi cambiati.
// Cosi' il backend non manda ai partecipanti notifiche di modifiche mai fatte, e non rifiuta
// una data d'inizio rimandata invariata su un evento gia' iniziato.

/** Valori del form a partire dall'evento salvato */
export function valoriDaEvento(e: EventoDettaglioResponse): ValoriEvento {
  return {
    titolo: e.titolo,
    descrizione: e.descrizione ?? '',
    inizio: localeDaIstante(e.dataEvento),
    fine: localeDaIstante(e.dataFine),
    posizione: { lat: e.lat, lng: e.lng },
  }
}

/** Corpo della PATCH con i soli campi cambiati; vuoto ({}) se non e' cambiato nulla */
export function modificheEvento(iniziali: ValoriEvento, nuovi: ValoriEvento): ModificaEventoRequest {
  const modifiche: ModificaEventoRequest = {}
  const titolo = nuovi.titolo.trim()
  const descrizione = nuovi.descrizione.trim()

  if (titolo !== iniziali.titolo.trim()) modifiche.titolo = titolo
  // "" toglie la descrizione (regola delle PATCH, progettazione v4 sezione 0)
  if (descrizione !== iniziali.descrizione.trim()) modifiche.descrizione = descrizione
  // Date confrontate come valori dei campi (al minuto): se l'utente non le tocca non si inviano
  if (nuovi.inizio !== iniziali.inizio) modifiche.dataEvento = istanteDaLocale(nuovi.inizio)
  if (nuovi.fine !== iniziali.fine) modifiche.dataFine = istanteDaLocale(nuovi.fine)
  if (nuovi.posizione && iniziali.posizione) {
    if (nuovi.posizione.lat !== iniziali.posizione.lat) modifiche.lat = nuovi.posizione.lat
    if (nuovi.posizione.lng !== iniziali.posizione.lng) modifiche.lng = nuovi.posizione.lng
  }
  return modifiche
}
