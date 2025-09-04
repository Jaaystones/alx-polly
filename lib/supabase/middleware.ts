import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Initialize a default response
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables are missing')
    return supabaseResponse
  }

  // Create the Supabase server client
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          // Set cookies with security options
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true
            })
          )
        },
      },
    }
  )

  // Get the user session - this refreshes the session if needed
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if we have a session, and if not, check if we need to redirect
  if (
    !session &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/register') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    request.nextUrl.pathname !== '/' // Allow access to homepage without login
  ) {
    // Create a URL object for the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    
    // Add the original URL as a query parameter to redirect after login
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    
    // Redirect to login
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}