'use client'
import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { MermaidDiagram } from './MermaidDiagram'

// ─── Code block with copy button ─────────────────────────────────────────────

function CodeBlock({ className, children }: ComponentPropsWithoutRef<'code'>) {
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  // Fenced code blocks get language- or hljs class from rehype-highlight
  const isBlock = /language-|hljs/.test(className ?? '')

  if (!isBlock) {
    // Inline code — break-all prevents long strings from overflowing the message bubble
    return (
      <code className="bg-white/[0.08] border border-white/[0.08] px-1.5 py-0.5 rounded text-[0.8em] font-mono text-violet-300 break-all">
        {children}
      </code>
    )
  }

  // Mermaid diagrams get their own renderer
  if (/language-mermaid/.test(className ?? '')) {
    const code = String(children).replace(/\n$/, '')
    return <MermaidDiagram code={code} />
  }

  const language = (className ?? '').replace(/language-|hljs/g, '').trim()

  const handleCopy = () => {
    const text = preRef.current?.innerText ?? ''
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.04]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-white/[0.06]">
        <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/70 transition-colors"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copiado</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <pre ref={preRef} className="overflow-x-auto px-4 py-3 text-xs leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-message text-sm leading-relaxed min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Code (inline + block)
          code: CodeBlock,
          // Paragraphs — strip default margins between last child
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">{children}</p>
          ),
          // Headings
          h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold text-white mt-3 mb-1 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-semibold text-white/80 mt-2 mb-0.5 first:mt-0">{children}</h3>,
          // Lists
          ul: ({ children }) => <ul className="mb-2 pl-4 space-y-0.5 list-disc list-outside">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 pl-4 space-y-0.5 list-decimal list-outside">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="my-2 pl-3 border-l-2 border-violet-400/40 text-white/60 italic">
              {children}
            </blockquote>
          ),
          // Horizontal rule
          hr: () => <hr className="my-3 border-white/[0.08]" />,
          // Strong / em
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="text-white/70 italic">{children}</em>,
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          // Tables
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="min-w-full text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-white/60 border-b border-white/[0.08] bg-white/[0.04]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-white/[0.04] text-white/80">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
