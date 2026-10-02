// Indirizzi da e verso le coordinate con Nominatim di OpenStreetMap (Decisione 26): gratuito,
// senza chiave, stessi dati delle tessere di OpenFreeMap. Le regole d'uso
// (operations.osmfoundation.org/policies/nominatim) chiedono al massimo 1 richiesta al secondo e
// vietano l'autocompletamento: la ricerca parte solo con Invio o "Cerca", mai a ogni tasto.
// Niente MapLibre qui dentro: si puo' importare senza caricare la mappa.
import type { Coordinate } from './tipi'

const NOMINATIM = 'https://nominatim.openstreetmap.org'

/** Un risultato: testo breve da mostrare ("Via del Corso 12, Roma") e punto sulla mappa */
export type Indirizzo = {
  testo: string
  punto: Coordinate
}

type LuogoNominatim = {
  lat: string
  lon: string
  name?: string
  display_name: string
  address?: Record<string, string | undefined>
}

/**
 * Testo breve: via con civico e citta' (il display_name completo e' lunghissimo). Con conNome anche il
 * nome del luogo, utile nei risultati della ricerca ("Pantheon, Piazza della Rotonda, Roma"); per un
 * clic sulla mappa no: il punto piu' vicino e' spesso una statua o un negozio. Senza via resta il nome.
 */
function testoBreve(l: LuogoNominatim, conNome: boolean): string {
  const a = l.address ?? {}
  const via = a.road ?? a.pedestrian ?? a.square ?? a.footway ?? a.path
  const strada = via && a.house_number ? `${via} ${a.house_number}` : via
  const citta = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet
  const nome = l.name && l.name !== via && (conNome || !strada) ? l.name : undefined
  // Niente via e niente nome (es. un'area pedonale senza nome): almeno il quartiere
  const zona = !strada && !nome ? (a.quarter ?? a.neighbourhood ?? a.suburb) : undefined
  const parti = [nome, strada, zona, citta].filter(
    (p, i, tutte): p is string => !!p && tutte.indexOf(p) === i,
  )
  return parti.length ? parti.join(', ') : l.display_name
}

// Indirizzi gia' trovati, per punto (5 decimali, ~1 m): niente richieste ripetute per lo stesso punto
const cache = new Map<string, string | null>()
const chiave = (p: Coordinate) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`

/** Indirizzo gia' noto per quel punto: string se trovato, null se Nominatim non ne ha, undefined se mai chiesto */
export function indirizzoInCache(punto: Coordinate): string | null | undefined {
  return cache.get(chiave(punto))
}

// Turni da almeno 1 secondo fra una richiesta e l'altra (regole d'uso di Nominatim)
let prossimoTurno = 0

function aspettaTurno(signal: AbortSignal): Promise<void> {
  const ora = Date.now()
  const attesa = Math.max(0, prossimoTurno - ora)
  prossimoTurno = Math.max(ora, prossimoTurno) + 1000
  if (attesa === 0) return Promise.resolve()
  return new Promise((risolvi, rifiuta) => {
    const timer = setTimeout(risolvi, attesa)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      rifiuta(signal.reason)
    })
  })
}

async function chiedi<T>(percorso: string, parametri: Record<string, string>, signal: AbortSignal): Promise<T> {
  await aspettaTurno(signal)
  const query = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': 'it', ...parametri })
  const risposta = await fetch(`${NOMINATIM}/${percorso}?${query}`, { signal, headers: { Accept: 'application/json' } })
  if (!risposta.ok) throw new Error(`Nominatim ha risposto ${risposta.status}`)
  return (await risposta.json()) as T
}

/**
 * Luoghi che corrispondono al testo (via, piazza, locale...), al massimo 5. Con vicinoA i risultati
 * vicini a quel punto vengono prima ("Via Roma" e' quella della citta' che si sta guardando).
 */
export async function cercaIndirizzi(testo: string, signal: AbortSignal, vicinoA?: Coordinate): Promise<Indirizzo[]> {
  const parametri: Record<string, string> = { q: testo, limit: '5' }
  if (vicinoA) {
    // Riquadro di ~30 km attorno al punto (sinistra, alto, destra, basso): preferito, non obbligatorio
    const d = 0.15
    parametri.viewbox = [vicinoA.lng - d, vicinoA.lat + d, vicinoA.lng + d, vicinoA.lat - d].join(',')
  }
  const luoghi = await chiedi<LuogoNominatim[]>('search', parametri, signal)
  const risultati: Indirizzo[] = []
  for (const l of luoghi) {
    const testo = testoBreve(l, true)
    // Lo stesso luogo arriva spesso piu' volte (la piazza come area e come punto): si tiene il primo
    if (risultati.some((r) => r.testo === testo)) continue
    const punto = { lat: Number(l.lat), lng: Number(l.lon) }
    // Scegliendolo, l'indirizzo del punto e' gia' questo: niente richiesta inversa
    cache.set(chiave(punto), testo)
    risultati.push({ testo, punto })
  }
  return risultati
}

/** Indirizzo del punto, o null se li' Nominatim non trova niente (es. in mezzo al mare) */
export async function indirizzoDi(punto: Coordinate, signal: AbortSignal): Promise<string | null> {
  const noto = indirizzoInCache(punto)
  if (noto !== undefined) return noto
  // zoom 18: il dettaglio dell'edificio, cosi' arriva anche il civico. layer address: si cercano solo
  // indirizzi (edifici con civico, strade), non negozi o monumenti, che spesso il civico non ce l'hanno.
  // Il civico arriva solo se in OpenStreetMap c'e': cliccando in mezzo alla strada resta la via.
  const luogo = await chiedi<LuogoNominatim | { error: string }>(
    'reverse',
    { lat: String(punto.lat), lon: String(punto.lng), zoom: '18', layer: 'address' },
    signal,
  )
  const testo = 'error' in luogo ? null : testoBreve(luogo, false)
  cache.set(chiave(punto), testo)
  return testo
}
