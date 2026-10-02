import { DURATA_TRANSIZIONE, DURATA_USCITA, type FaseTransizione } from './useCodiceSegreto'

// Transizione della Modalita' Ragnatela: fili di ragnatela astratti che si tendono sullo schermo
// all'entrata (~1 s) e si ritirano verso il centro all'uscita (~0,7 s, sopra NoseY che ricompare).
// Animata con SMIL (<animate>) invece che con il CSS, cosi' non trascina ragnatela.css nel bundle
// principale. Colori uguali a ragnatela.css (--rg-sfondo, --rg-rosso).
// Montata solo durante la transizione: con prefers-reduced-motion non compare mai.

const RAGGI = 16
/** Distanze dal centro degli anelli, in unita' del viewBox (100 x 100) */
const ANELLI = [7, 13, 20, 28, 37, 47, 58, 70]
const CENTRO = { x: 62, y: 38 }
const LUNGHEZZA = 130
const OPACITA_SFONDO = 0.94

const sec = (ms: number) => `${ms / 1000}s`

// Punti del raggio i alla distanza r, con un po' di irregolarita' per sembrare tessuta a mano
function punto(i: number, r: number): string {
  const angolo = (i / RAGGI) * 2 * Math.PI + 0.2
  const scarto = 1 + 0.06 * Math.sin(i * 2.3 + r)
  return `${(CENTRO.x + Math.cos(angolo) * r * scarto).toFixed(2)},${(CENTRO.y + Math.sin(angolo) * r * scarto).toFixed(2)}`
}

const raggi = Array.from({ length: RAGGI }, (_, i) => `M ${CENTRO.x},${CENTRO.y} L ${punto(i, LUNGHEZZA)}`)
const anelli = ANELLI.map((r) => `M ${Array.from({ length: RAGGI + 1 }, (_, i) => punto(i % RAGGI, r)).join(' L ')}`)

/** Tempi (ms) di ogni pezzo: all'entrata i fili crescono dal centro, all'uscita si ritirano */
function tempi(fase: FaseTransizione) {
  if (fase === 'entrata') {
    const D = DURATA_TRANSIZIONE
    return {
      sfondo: { da: 0, a: OPACITA_SFONDO, inizio: 0, durata: D * 0.5 },
      alone: { valori: '0;0.35;0.15', inizio: 0, durata: D },
      raggio: (i: number) => ({ da: 1, a: 0, inizio: i * 15, durata: D * 0.38 }),
      anello: (i: number) => ({ da: 1, a: 0, inizio: D * 0.25 + i * 45, durata: D * 0.26 }),
    }
  }
  const U = DURATA_USCITA
  return {
    sfondo: { da: OPACITA_SFONDO, a: 0, inizio: U * 0.35, durata: U * 0.65 },
    alone: { valori: '0.15;0', inizio: 0, durata: U * 0.6 },
    // Prima gli anelli, dall'esterno verso l'interno, poi i raggi verso il centro
    raggio: (i: number) => ({ da: 0, a: 1, inizio: U * 0.28 + i * 10, durata: U * 0.43 }),
    anello: (i: number) => ({ da: 0, a: 1, inizio: (ANELLI.length - 1 - i) * 35, durata: U * 0.32 }),
  }
}

export function TransizioneRagnatela({ fase }: { fase: FaseTransizione }) {
  const t = tempi(fase)
  // All'uscita si parte dalla tela completa: i fili sono gia' disegnati prima che l'animazione inizi
  const offsetIniziale = fase === 'entrata' ? '1' : '0'

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="size-full">
        <defs>
          {/* Alone rosso attorno ai fili: li stacca dalla pagina che c'e' sotto */}
          <filter id="rg-alone-fili" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.45" floodColor="#E22328" floodOpacity="0.95" />
          </filter>
          <radialGradient id="rg-lampo">
            <stop offset="0%" stopColor="#E22328" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#E22328" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100" height="100" fill="#0B0D11" opacity={fase === 'entrata' ? 0 : OPACITA_SFONDO}>
          <animate
            attributeName="opacity"
            from={t.sfondo.da}
            to={t.sfondo.a}
            begin={sec(t.sfondo.inizio)}
            dur={sec(t.sfondo.durata)}
            fill="freeze"
          />
        </rect>
        <circle cx={CENTRO.x} cy={CENTRO.y} r="45" fill="url(#rg-lampo)" opacity={fase === 'entrata' ? 0 : 0.15}>
          <animate attributeName="opacity" values={t.alone.valori} begin={sec(t.alone.inizio)} dur={sec(t.alone.durata)} fill="freeze" />
        </circle>

        <g fill="none" stroke="#F4F4F6" strokeLinecap="round" filter="url(#rg-alone-fili)">
          {raggi.map((d, i) => {
            const r = t.raggio(i)
            return (
              <path key={`r${i}`} d={d} pathLength={1} strokeDasharray="1" strokeDashoffset={offsetIniziale} strokeWidth="0.26">
                <animate attributeName="stroke-dashoffset" from={r.da} to={r.a} begin={sec(r.inizio)} dur={sec(r.durata)} fill="freeze" />
              </path>
            )
          })}
          {anelli.map((d, i) => {
            const a = t.anello(i)
            return (
              <path
                key={`a${i}`}
                d={d}
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={offsetIniziale}
                strokeWidth="0.16"
                strokeOpacity="0.85"
              >
                <animate attributeName="stroke-dashoffset" from={a.da} to={a.a} begin={sec(a.inizio)} dur={sec(a.durata)} fill="freeze" />
              </path>
            )
          })}
        </g>

        {/* Lampo nel punto da cui parte la tela, solo all'entrata */}
        {fase === 'entrata' && (
          <circle cx={CENTRO.x} cy={CENTRO.y} r="0" fill="#fff">
            <animate attributeName="r" from="0" to="7" dur={sec(DURATA_TRANSIZIONE * 0.35)} fill="freeze" />
            <animate attributeName="opacity" from="1" to="0" dur={sec(DURATA_TRANSIZIONE * 0.35)} fill="freeze" />
          </circle>
        )}
      </svg>
    </div>
  )
}
