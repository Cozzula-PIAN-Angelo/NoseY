// Distanze sulla mappa, con la stessa formula del backend (Haversine, progettazione v4).

type Punto = { lat: number; lng: number }

/** Distanza in km fra due punti */
export function distanzaKm(a: Punto, b: Punto): number {
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}
