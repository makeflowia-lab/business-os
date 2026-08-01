'use client'

/**
 * Esfera holográfica 3D — el corazón visual de JARVIS.
 * CSS puro: globo wireframe (meridianos + paralelos en preserve-3d) girando,
 * núcleo de energía respirando, halo, ecuador punteado y partículas en órbita.
 */
export function Sphere({ size = 300, label, sub }: { size?: number; label: string; sub?: string }) {
  const R = size / 2
  // Meridianos (aros verticales rotados sobre Y)
  const meridians = [0, 30, 60, 90, 120, 150]
  // Paralelos: altura z relativa → radio del aro = √(R² − z²)
  const parallels = [-0.66, -0.33, 0, 0.33, 0.66]

  return (
    <div className="sphere-scene relative" style={{ width: size, height: size }}>
      {/* Halo exterior */}
      <div className="sphere-halo" />

      {/* Globo wireframe 3D */}
      <div className="sphere-3d h-full w-full">
        {meridians.map((deg) => (
          <div key={`m${deg}`} className="sphere-ring" style={{ transform: `rotateY(${deg}deg)` }} />
        ))}
        {parallels.map((k) => {
          const z = k * R
          const r = Math.sqrt(Math.max(R * R - z * z, 0))
          return (
            <div
              key={`p${k}`}
              className="sphere-ring"
              style={{
                inset: 'auto',
                left: R - r,
                top: R - r,
                width: r * 2,
                height: r * 2,
                transform: `rotateX(90deg) translateZ(${z}px)`,
                borderColor: k === 0 ? 'rgba(34,211,238,0.4)' : 'rgba(34,211,238,0.16)',
              }}
            />
          )
        })}
      </div>

      {/* Núcleo de energía */}
      <div className="sphere-core-glow" />

      {/* Ecuador punteado contra-rotando */}
      <div className="sphere-equator" />

      {/* Partículas en órbita */}
      {[0.56, 0.62, 0.5].map((k, i) => (
        <span
          key={i}
          className="sphere-orbit-dot"
          style={{
            ['--orbit-r' as string]: `${R * 2 * k * 0.5 + R * 0.12}px`,
            animationDuration: `${7 + i * 4}s`,
            animationDelay: `${i * -3}s`,
            opacity: 0.9 - i * 0.25,
          }}
        />
      ))}

      {/* Identidad en el centro */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
        <div className="hud-label">núcleo</div>
        <div className="glow-text max-w-[70%] font-title text-2xl font-bold uppercase leading-tight tracking-widest text-jarvis-glow">
          {label}
        </div>
        {sub && <div className="mt-1 font-mono text-[10px] tracking-[0.3em] text-jarvis-dim">{sub}</div>}
      </div>
    </div>
  )
}
