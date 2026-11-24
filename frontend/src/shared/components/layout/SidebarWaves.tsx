import { useTheme, type WaveStyle } from '@/shared/contexts/ThemeContext';

/**
 * Decorative background for the navigation. Colour comes from `.sb-waves`
 * (accent on light sidebars, white on dark/gradient ones).
 */
export function SidebarWaves({ style }: { style?: WaveStyle }) {
  const { wave } = useTheme()
  const s = style ?? wave
  if (s === 'none') return null
  return (
    <div aria-hidden className={`sb-waves ${style ? '' : 'sb-waves--live'} absolute inset-0 overflow-hidden`}>
      {s === 'flow' && <Flow />}
      {s === 'ribbon' && <Ribbon />}
      {s === 'aurora' && <Aurora />}
      {s === 'dots' && <Dots />}
      {s === 'topo' && <Topo />}
    </div>
  )
}

/** Two identical periods so translateX(-50%) loops seamlessly. */
const PERIOD = 'M0 40 C 150 80 350 0 500 40 C 650 80 850 0 1000 40'

/** Deeper swell for the Flow bands (still two identical periods). */
const SWELL = 'M0 60 C 160 130 340 -10 500 60 C 660 130 840 -10 1000 60'

function Flow() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-80">
      {[
        { top: 40,  opacity: 0.12, dur: '26s', reverse: false },
        { top: 95,  opacity: 0.17, dur: '19s', reverse: true },
        { top: 150, opacity: 0.22, dur: '14s', reverse: false },
        { top: 205, opacity: 0.28, dur: '10s', reverse: true },
      ].map((w, i) => (
        <svg key={i} viewBox="0 0 1000 200" preserveAspectRatio="none" className="sb-wave absolute left-0 h-44 w-[200%]"
          style={{ top: w.top, opacity: w.opacity, animationDuration: w.dur, animationDirection: w.reverse ? 'reverse' : 'normal' }}>
          <path d={`${SWELL} L1000 200 L0 200 Z`} fill="currentColor" />
        </svg>
      ))}
    </div>
  )
}

function Ribbon() {
  return (
    <div className="absolute inset-x-0 bottom-6 h-72">
      {Array.from({ length: 7 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 1000 80"
          preserveAspectRatio="none"
          className="sb-wave absolute left-0 h-20 w-[200%]"
          style={{ top: i * 26, opacity: 0.1 + i * 0.035, animationDuration: `${14 + i * 3}s`, animationDirection: i % 2 ? 'reverse' : 'normal' }}
        >
          <path d={PERIOD} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </svg>
      ))}
    </div>
  )
}

function Aurora() {
  return (
    <>
      <div className="sb-float absolute -top-16 -left-20 size-72 rounded-full opacity-[0.16] blur-3xl" style={{ background: 'currentColor', animationDuration: '9s' }} />
      <div className="sb-float absolute top-1/3 -right-24 size-64 rounded-full opacity-[0.12] blur-3xl" style={{ background: '#e2bd78', animationDuration: '12s', animationDelay: '-4s' }} />
      <div className="sb-float absolute -bottom-20 left-0 size-80 rounded-full opacity-[0.14] blur-3xl" style={{ background: 'currentColor', animationDuration: '14s', animationDelay: '-7s' }} />
    </>
  )
}

function Dots() {
  return (
    <div
      className="sb-drift absolute inset-0 opacity-[0.22]"
      style={{
        backgroundImage: 'radial-gradient(currentColor 1.1px, transparent 1.3px)',
        backgroundSize: '14px 14px',
        maskImage: 'radial-gradient(120% 55% at 50% 100%, black 20%, transparent 70%), radial-gradient(90% 30% at 0% 0%, black 10%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(120% 55% at 50% 100%, black 20%, transparent 70%), radial-gradient(90% 30% at 0% 0%, black 10%, transparent 70%)',
        animationDuration: '30s',
      }}
    />
  )
}

function Topo() {
  const rings = Array.from({ length: 9 }, (_, i) => 30 + i * 22)
  return (
    <svg viewBox="0 0 400 400" className="sb-spin absolute -right-40 -bottom-40 size-[460px] opacity-[0.22]" style={{ animationDuration: '120s' }}>
      {rings.map((r, i) => (
        <path
          key={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          d={blob(200, 200, r, i)}
        />
      ))}
    </svg>
  )
}

/** Organic closed contour for the topography style. */
function blob(cx: number, cy: number, r: number, seed: number) {
  const pts = 10
  const out: [number, number][] = []
  for (let k = 0; k < pts; k++) {
    const a = (k / pts) * Math.PI * 2
    const wobble = 1 + 0.09 * Math.sin(a * 3 + seed * 0.7) + 0.05 * Math.cos(a * 5 - seed)
    out.push([cx + Math.cos(a) * r * wobble, cy + Math.sin(a) * r * wobble])
  }
  const mid = (p: [number, number], q: [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  let d = `M${mid(out[pts - 1], out[0]).join(' ')}`
  out.forEach((p, k) => {
    const m = mid(p, out[(k + 1) % pts])
    d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`
  })
  return d + 'Z'
}
