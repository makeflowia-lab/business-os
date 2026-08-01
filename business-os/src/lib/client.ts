'use client'

export async function api<T = Record<string, unknown>>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {}
  const res = await fetch(path, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...rest.headers },
    ...(json !== undefined && { body: JSON.stringify(json) }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Error ${res.status}`)
  return data as T
}

export function fecha(d: string | Date): string {
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
