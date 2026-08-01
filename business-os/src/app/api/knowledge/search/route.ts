import { NextRequest, NextResponse } from 'next/server'
import { searchKnowledge } from '@/lib/brain'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query) return NextResponse.json({ results: [] })
  const results = await searchKnowledge(query, 10)
  return NextResponse.json({ results })
}
