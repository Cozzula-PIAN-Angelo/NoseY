import { useEffect, useRef, useState } from 'react'
import MapGL, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './mappa.css'
import { Icon } from '@/components/ui'
import { cx } from '@/lib/cx'
import { arrotonda, URL_STILI, type MappaProps } from './tipi'

// Mappa comune (FE1-02) su MapLibre GL + OpenFreeMap (Decisione 6).
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
              title={m.etichetta}
              aria-label={m.etichetta}
              role={m.onClick ? 'button' : 'img'}
              className="block size-4 rounded-full ring-4 ring-surface-deep"
              style={{
                backgroundColor: m.colore ?? 'var(--color-primary)',
                boxShadow: `0 0 12px ${m.colore ?? 'var(--color-primary)'}`,
                cursor: m.onClick ? 'pointer' : 'default',
              }}
            />
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
          className="absolute inset-x-space-sm bottom-space-sm flex items-center gap-space-xs rounded-lg bg-surface-card/95 px-space-sm py-space-xs font-body-sm text-body-sm text-on-surface-variant"
        >
          <Icon nome="cloud_off" size={18} className="text-status-annullato" />
          Parte della mappa non si è caricata. Controlla la connessione.
        </div>
      )}
    </div>
  )
}
