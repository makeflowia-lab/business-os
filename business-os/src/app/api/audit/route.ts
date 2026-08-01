import { NextResponse } from 'next/server'
import { listAudit } from '@/lib/audit'

export async function GET() {
  return NextResponse.json({ audit: await listAudit(200) })
}
