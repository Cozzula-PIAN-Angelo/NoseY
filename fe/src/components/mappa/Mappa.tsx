import { useEffect, useRef, useState } from 'react'
import MapGL, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './mappa.css'
import { Icon } from '@/components/ui'
import { cx } from '@/lib/cx'
import { IconaEvento, IconaPoi, STILE_POI, STILE_STATO } from './IconaMarker'
import { arrotonda, ATTRIBUZIONE, URL_STILI, type MappaProps, type MarkerMappa } from './tipi'

// Nome del marker per lo screen reader: "Chronos (in corso)", "Ingresso nord (ingresso)"
function etichettaMarker(m: MarkerMappa): string {
  const tipo = m.tipo === 'evento' ? STILE_STATO[m.stato].etichetta : STILE_POI[m.tipo].etichetta
  return m.etichetta ? `${m.etichetta} (${tipo.toLowerCase()})` : tipo
}

// Mappa comune (FE1-02) su MapLibre GL + OpenFreeMap (Decisione 8).
// Non importarla direttamente: usa <Mappa /> da '@/components/mappa', che la carica solo quando serve.
export default function Mappa({
  centro,
  zoom = 13,
  marker = [],
  puntoScelto,
  onScegliPunto,
  stile = 'dark',
  etichetta = 'Mappa',
  className,
}: MappaProps) {
  const mappa = useRef<MapRef>(null)
  const [errore, setErrore] = useState(false)
  const sceltaAttiva = onScegliPunto !== undefined

  // Il centro iniziale lo gestisce MapLibre; se poi cambia (es. un altro evento), ci si sposta
  useEffect(() => {
    mappa.current?.flyTo({ center: [centro.lng, centro.lat], zoom, duration: 800 })
  }, [centro.lat, centro.lng, zoom])

  return (
    <div
      role="region"
      aria-label={etichetta}
      className={cx('mappa-nosey relative h-96 w-full overflow-hidden rounded-xl bg-surface-container', className)}
    >
      <MapGL
        ref={mappa}
        initialViewState={{ latitude: centro.lat, longitude: centro.lng, zoom }}
        mapStyle={URL_STILI[stile]}
        style={{ width: '100%', height: '100%' }}
        cursor={sceltaAttiva ? 'crosshair' : undefined}
        onClick={sceltaAttiva ? (e) => onScegliPunto(arrotonda(e.lngLat)) : undefined}
        onError={() => setErrore(true)}
        // Sempre aperta (compact: false): la licenza chiede che l'attribuzione si veda
        // senza dover cliccare sulla "i"
        attributionControl={{ compact: false, customAttribution: ATTRIBUZIONE }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {marker.map((m) => (
          <Marker
            key={m.id}
            latitude={m.lat}
            longitude={m.lng}
            anchor="center"
            onClick={(e) => {
              // Senza questo il clic sul marker arriverebbe anche alla mappa (scelta del punto)
              e.originalEvent.stopPropagation()
              m.onClick?.()
            }}
          >
            <span
              title={etichettaMarker(m)}
              aria-label={etichettaMarker(m)}
              role={m.onClick ? 'button' : 'img'}
              // Cliccabile anche da tastiera: Tab per arrivarci, Invio o spazio per aprirlo
              tabIndex={m.onClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (m.onClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  m.onClick()
                }
              }}
              className={cx(
                'block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                m.onClick ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              {m.tipo === 'evento' ? <IconaEvento stato={m.stato} selezionato={m.selezionato} /> : <IconaPoi tipo={m.tipo} />}
            </span>
          </Marker>
        ))}

        {sceltaAttiva && puntoScelto && (
          <Marker
            latitude={puntoScelto.lat}
            longitude={puntoScelto.lng}
            anchor="bottom"
            draggable
            onDragEnd={(e) => onScegliPunto(arrotonda(e.lngLat))}
          >
            <Icon nome="location_on" piena size={40} className="text-tertiary drop-shadow-lg" />
          </Marker>
        )}
      </MapGL>

      {errore && (
        <div
          role="alert"
          className="absolute left-space-sm right-14 top-space-sm flex items-center gap-space-xs rounded-lg bg-surface-card/95 px-space-sm py-space-xs font-body-sm text-body-sm text-on-surface-variant"
        >
          <Icon nome="cloud_off" size={18} className="text-status-annullato" />
          Parte della mappa non si è caricata. Controlla la connessione.
        </div>
      )}
    </div>
  )
}
