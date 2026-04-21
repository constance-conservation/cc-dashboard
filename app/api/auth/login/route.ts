import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_DOMAIN = 'constanceconservation.com.au'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') as string | null)?.trim().toLowerCase()

  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return NextResponse.redirect(new URL('/login?error=domain', request.url))
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/api/auth/confirm`,
    },
  })

  if (error) {
    console.error('Magic link error:', error.message, '| code:', error.code ?? 'none', '| redirect:', `${siteUrl}/api/auth/confirm`)
    return NextResponse.redirect(new URL('/login?error=send', request.url))
  }

  return NextResponse.redirect(new URL('/login?sent=1', request.url))
}
