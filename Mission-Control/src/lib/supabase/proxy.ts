import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isEmailAllowed } from '@/lib/auth-config'

type CookieOptions = {
  maxAge?: number
  expires?: Date
  path?: string
  domain?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              path: '/',
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: SESSION_MAX_AGE,
              ...options,
            })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // API routes for webhooks bypass auth (they use bearer tokens)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/signup')
  const isPublicRoute = isAuthRoute ||
                        request.nextUrl.pathname.startsWith('/check-email') ||
                        request.nextUrl.pathname.startsWith('/forgot-password') ||
                        request.nextUrl.pathname.startsWith('/update-password')

  if (isApiRoute) {
    return supabaseResponse
  }

  // Not authenticated → login
  if (!isPublicRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated but email not whitelisted → sign out and block
  if (user && !isEmailAllowed(user.email ?? '')) {
    await supabase.auth.signOut()
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  // Already authenticated → redirect away from auth pages
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}
