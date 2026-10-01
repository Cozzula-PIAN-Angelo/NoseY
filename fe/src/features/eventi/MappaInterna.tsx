import { IconaPoi, Mappa, STILE_POI, type MarkerMappa } from '@/components/mappa'
import type { EventoDettaglioResponse } from '@/types/api'

// Mappa interna dell'evento (FE1-05): la posizione dell'evento e i suoi POI (ingressi, uscite,
// emergenza, entro 2 km), con l'elenco dei punti sotto la mappa come nella schermata Stitch.
export function MappaInterna({ evento }: { evento: EventoDettaglioResponse }) {
  const marker: MarkerMappa[] = [
    { id: evento.id, tipo: 'evento', stato: evento.stato, lat: evento.lat, lng: evento.lng, etichetta: evento.titolo },
    ...evento.poi.map(
      (p): MarkerMappa => ({ id: p.id, tipo: p.tipo, lat: p.lat, lng: p.lng, etichetta: p.etichetta ?? undefined }),
    ),
  ]

  return (
    <div className="flex flex-col gap-space-sm">
      <Mappa
        etichetta={`Mappa interna di ${evento.titolo}`}
        centro={{ lat: evento.lat, lng: evento.lng }}
        zoom={evento.poi.length ? 16 : 15}
        marker={marker}
        className="h-80"
      />

      {evento.poi.length === 0 ? (
        <p className="font-body-md text-body-md text-outline">
          L'organizzatore non ha ancora indicato ingressi, uscite e punti di emergenza.
        </p>
      ) : (
        <ul className="grid gap-space-sm sm:grid-cols-2 xl:grid-cols-3">
          {evento.poi.map((p) => (
            <li key={p.id} className="flex items-center gap-space-sm rounded-xl bg-surface-card p-space-sm">
              <IconaPoi tipo={p.tipo} />
              <div className="flex min-w-0 flex-col">
                <span className={`font-label-code-status text-label-code-status uppercase ${STILE_POI[p.tipo].testo}`}>
                  {STILE_POI[p.tipo].etichetta}
                </span>
                {p.etichetta && <span className="truncate font-label-btn text-label-btn text-on-surface">{p.etichetta}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
