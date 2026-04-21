import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(_request: NextRequest) {
  // Auth guard temporarily disabled — magic link flow has a Supabase URL config
  // issue being resolved. Re-enable by restoring the full middleware body.
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
