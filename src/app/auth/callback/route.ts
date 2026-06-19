import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)

  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/login', request.url)
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL('/auth/login', request.url)
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      new URL('/auth/login', request.url)
    )
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  switch (profile?.role) {
    case 'SUPER_ADMIN':
      return NextResponse.redirect(
        new URL('/dashboard/admin', request.url)
      )

    case 'CLINIC_ADMIN':
      return NextResponse.redirect(
        new URL('/dashboard/clinic', request.url)
      )

    case 'STAFF':
      return NextResponse.redirect(
        new URL('/dashboard/staff', request.url)
      )

    case 'PATIENT':
      return NextResponse.redirect(
        new URL('/dashboard/patient', request.url)
      )

    default:
      return NextResponse.redirect(
        new URL('/auth/login', request.url)
      )
  }
}