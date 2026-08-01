import { NextRequest, NextResponse } from 'next/server'
import { q } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10) || 100, 300)
  const memory = await q(
    `SELECT tipo, titulo, detalle, created_at FROM bo_memory ORDER BY created_at DESC LIMIT $1`,
    [limit],
  )
  return NextResponse.json({ memory })
}
