import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/server'
import { PROTECTED_ROUTES, ROLE_REDIRECTS, UserRole } from '@/types'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthRoute =
  pathname.startsWith('/auth/login') ||
  pathname.startsWith('/auth/signup')
  const isSetPassword = pathname.startsWith('/auth/set-password')
  const isConfirm = pathname.startsWith('/auth/confirm')
  const isOnboarding = pathname.startsWith('/onboarding')

  if (isSetPassword || isConfirm) return response

  // ── Auth routes ───────────────────────────────────────────
  if (isAuthRoute) {
    if (user) {
      const { data: profile } = await supabase
        .from('users').select('role').eq('id', user.id).single()
      const role = profile?.role as UserRole | undefined
      return NextResponse.redirect(
        new URL(role ? ROLE_REDIRECTS[role] : '/auth/login', request.url)
      )
    }
    return response
  }

  // ── All protected routes need auth ────────────────────────
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    if (!user) return NextResponse.redirect(new URL('/auth/login', request.url))

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    const role = profile?.role as UserRole | undefined
    if (!role) return NextResponse.redirect(new URL('/auth/login', request.url))

    // CLINIC_ADMIN without org → force onboarding (skip if already there)
    if (role === 'CLINIC_ADMIN' && !isOnboarding) {
      const { data: org } = await supabase
        .from('organizations').select('id').eq('admin_id', user.id).maybeSingle()
      if (!org) return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Already on onboarding but org exists → go to dashboard
    if (role === 'CLINIC_ADMIN' && isOnboarding) {
      const { data: org } = await supabase
        .from('organizations').select('id').eq('admin_id', user.id).maybeSingle()
      if (org) return NextResponse.redirect(new URL(ROLE_REDIRECTS['CLINIC_ADMIN'], request.url))
    }

    // Role-based route guard
    const matchedPrefix = Object.keys(PROTECTED_ROUTES).find(p => pathname.startsWith(p))
    if (matchedPrefix) {
      const allowed = PROTECTED_ROUTES[matchedPrefix]
      if (!allowed.includes(role)) {
        return NextResponse.redirect(new URL(ROLE_REDIRECTS[role], request.url))
      }
    }

    return response
  }

  // ── Root ──────────────────────────────────────────────────
  if (pathname === '/') {
    if (!user) return NextResponse.redirect(new URL('/search', request.url))
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    const role = profile?.role as UserRole | undefined
    return NextResponse.redirect(
      new URL(role ? ROLE_REDIRECTS[role] : '/auth/login', request.url)
    )
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',],
}