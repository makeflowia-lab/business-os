'use client'
import { useState } from 'react'
import { Zap } from 'lucide-react'
import type { UsageMeta } from '../hooks/useChat'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

export function UsageBadge({ usage }: { usage: UsageMeta }) {
  const [expanded, setExpanded] = useState(false)
  const totalTokens = usage.inputTokens + usage.outputTokens

  if (totalTokens === 0) return null

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-colors"
      title="Token usage"
    >
      <Zap size={9} />
      {expanded ? (
        <span className="flex items-center gap-1.5">
          <span>{formatTokens(usage.inputTokens)} in</span>
          <span className="text-white/10">·</span>
          <span>{formatTokens(usage.outputTokens)} out</span>
          <span className="text-white/10">·</span>
          <span>{formatDuration(usage.durationMs)}</span>
          {usage.costUsd > 0 && (
            <>
              <span className="text-white/10">·</span>
              <span>${usage.costUsd.toFixed(4)}</span>
            </>
          )}
        </span>
      ) : (
        <span>{formatTokens(totalTokens)} tokens</span>
      )}
    </button>
  )
}
