'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/client'
import { Card, PageTitle, Btn, Badge, Spinner } from '@/components/ui'

export default function EquipoPage() {
  const [multiUser, setMultiUser] = useState<boolean>(false)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api<{ value: string | null }>('/api/settings?key=multi_user').then((res) => {
      setMultiUser(res.value === 'true')
      setLoaded(true)
    })
  }, [])

  async function toggleMultiUser() {
    setBusy(true)
    const nextVal = !multiUser
    await api('/api/settings', {
      method: 'POST',
      json: { key: 'multi_user', value: nextVal ? 'true' : 'false' }
    })
    setMultiUser(nextVal)
    setBusy(false)
  }

  return (
    <div className="pb-20">
      <PageTitle 
        title="Gestión de Equipo" 
        subtitle="Administra los accesos al Business OS. Por seguridad, el sistema asume que eres el único operador a menos que actives el modo Multi-Empleado." 
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="hud-label mb-4">◢ CONTROL DE ACCESO GLOBAL</div>
            <p className="font-mono text-sm text-jarvis-dim mb-6 leading-relaxed">
              El Modo Multi-Empleado protege el Business OS con una pantalla de inicio de sesión obligatoria. 
              Si está desactivado, el sistema asume que el usuario actual es el dueño y concede acceso total (Modo Single-Tenant Local).
            </p>
            
            <div className="flex items-center justify-between border border-jarvis-line/40 bg-black/30 p-4 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]">
              <div>
                <div className="font-title text-lg font-bold text-jarvis-text tracking-wider uppercase glow-text">
                  Modo Multi-Empleado
                </div>
                <div className="font-mono text-[10px] text-jarvis-cyan/70 tracking-widest uppercase mt-1">
                  ESTADO DEL KERNEL: {loaded ? (multiUser ? 'RESTRINGIDO (LOGIN REQUERIDO)' : 'ABIERTO (SOLO DUEÑO)') : 'Cargando...'}
                </div>
              </div>
              <Btn 
                variant={multiUser ? 'danger' : 'primary'} 
                onClick={toggleMultiUser}
                disabled={!loaded || busy}
              >
                {busy ? <Spinner /> : (multiUser ? '■ APAGAR MODO' : '▶ ENCENDER MODO')}
              </Btn>
            </div>
          </div>
        </Card>

        {multiUser ? (
          <Card delay={100} className="border-jarvis-cyan/30 bg-jarvis-cyan/5">
            <div className="hud-label mb-4 text-jarvis-cyan">◢ PROTOCOLO DE EQUIPO ACTIVO</div>
            <div className="flex flex-col items-center justify-center h-40 border border-dashed border-jarvis-cyan/30">
              <span className="text-2xl mb-2">👥</span>
              <span className="font-mono text-xs text-jarvis-cyan tracking-widest glow-text">PANEL DE USUARIOS HABILITADO</span>
              <span className="font-mono text-[10px] text-jarvis-dim mt-2 text-center px-8">
                El enrutador de autenticación interceptará las solicitudes. Próximamente podrás invitar miembros aquí.
              </span>
            </div>
          </Card>
        ) : (
          <Card delay={100} className="opacity-50 grayscale pointer-events-none">
            <div className="hud-label mb-4">◢ PROTOCOLO DE EQUIPO (INACTIVO)</div>
            <div className="flex flex-col items-center justify-center h-40 border border-dashed border-jarvis-line/50">
              <span className="text-2xl mb-2 opacity-50">🔒</span>
              <span className="font-mono text-xs text-jarvis-dim tracking-widest">SISTEMA EN MODO SINGLE-USER</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
