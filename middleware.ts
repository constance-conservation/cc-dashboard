import { type NextRequest, NextResponse } from 'next/server'

const ALLOWED_DOMAIN = 'constanceconservation.com.au'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth routes and static assets
  if (pathname.startsWith('/(auth)') || pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // When Supabase is wired up, check session here.
  // For now, redirect to login if no session cookie is present.
  // TODO: replace with actual Supabase session check once env vars are set
  const hasSession = request.cookies.has('cc-session')

  if (!hasSession && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

export { ALLOWED_DOMAIN }
