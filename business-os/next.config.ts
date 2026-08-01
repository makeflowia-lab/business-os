import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@anthropic-ai/claude-agent-sdk', 'pg'],
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
