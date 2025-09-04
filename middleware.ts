import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Exclude files and auth routes, but protect sensitive routes
    '/((?!_next/static|_next/image|favicon.ico|login|register|auth|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}