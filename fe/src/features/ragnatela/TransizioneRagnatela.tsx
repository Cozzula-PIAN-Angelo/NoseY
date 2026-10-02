import { DURATA_TRANSIZIONE } from './useCodiceSegreto'

// Transizione d'ingresso nella Modalita' Ragnatela: fili di ragnatela astratti che si tendono sullo
// schermo (~800 ms). Animata con SMIL (<animate>) invece che con il CSS, cosi' non trascina
// ragnatela.css nel bundle principale. Colori uguali a ragnatela.css (--rg-sfondo, --rg-rosso).
// Montata solo durante la transizione: con prefers-reduced-motion non compare mai.

const RAGGI = 14
/** Distanze dal centro degli anelli, in unita' del viewBox (100 x 100) */
const ANELLI = [9, 17, 26, 36, 47, 60, 74]
const CENTRO = { x: 62, y: 38 }
const LUNGHEZZA = 120

const sec = (ms: number) => `${ms / 1000}s`

// Punti del raggio i alla distanza r, con un po' di irregolarita' per sembrare tessuta a mano
function punto(i: number, r: number): string {
  const angolo = (i / RAGGI) * 2 * Math.PI + 0.2
  const scarto = 1 + 0.06 * Math.sin(i * 2.3 + r)
  return `${(CENTRO.x + Math.cos(angolo) * r * scarto).toFixed(2)},${(CENTRO.y + Math.sin(angolo) * r * scarto).toFixed(2)}`
}

const raggi = Array.from({ length: RAGGI }, (_, i) => `M ${CENTRO.x},${CENTRO.y} L ${punto(i, LUNGHEZZA)}`)
const anelli = ANELLI.map((r) => `M ${Array.from({ length: RAGGI + 1 }, (_, i) => punto(i % RAGGI, r)).join(' L ')}`)

export function TransizioneRagnatela() {
  const durataRaggi = DURATA_TRANSIZIONE * 0.45
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="size-full">
        <rect width="100" height="100" fill="#0B0D11" opacity="0">
          <animate attributeName="opacity" from="0" to="0.92" dur={sec(DURATA_TRANSIZIONE * 0.7)} fill="freeze" />
        </rect>
        <circle cx={CENTRO.x} cy={CENTRO.y} r="40" fill="#E22328" opacity="0">
          <animate attributeName="opacity" values="0;0.18;0.08" dur={sec(DURATA_TRANSIZIONE)} fill="freeze" />
        </circle>
        <g fill="none" stroke="#E3E2E6" strokeLinecap="round">
          {raggi.map((d, i) => (
            <path key={`r${i}`} d={d} pathLength={1} strokeDasharray="1" strokeDashoffset="1" strokeWidth="0.16" strokeOpacity="0.85">
              <animate
                attributeName="stroke-dashoffset"
                from="1"
                to="0"
                begin={sec(i * 12)}
                dur={sec(durataRaggi)}
                fill="freeze"
              />
            </path>
          ))}
          {anelli.map((d, i) => (
            <path key={`a${i}`} d={d} pathLength={1} strokeDasharray="1" strokeDashoffset="1" strokeWidth="0.11" strokeOpacity="0.6">
              <animate
                attributeName="stroke-dashoffset"
                from="1"
                to="0"
                begin={sec(DURATA_TRANSIZIONE * 0.25 + i * 50)}
                dur={sec(DURATA_TRANSIZIONE * 0.35)}
                fill="freeze"
              />
            </path>
          ))}
        </g>
      </svg>
    </div>
  )
}
