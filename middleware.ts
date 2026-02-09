import { NextResponse } from "next/server"
import { withAuth } from "next-auth/middleware"
import { getToken } from "next-auth/jwt"

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl

    // Add security headers
    const response = NextResponse.next()

    // Security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Cache control for static assets
    if (pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    }

    return response
  },
  {
    callbacks: {
      // Allow unauthorized access to public routes
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        // Allow access to public pages without authentication
        if (pathname === '/' || pathname === '/login' || pathname === '/register') {
          return true
        }
        // Require authentication for all other pages
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * OR the following public routes (no authentication required):
     * - / (root/login page)
     * - /login
     * - /register
     */
    '/((?!api|_next/static|_next/image|favicon.ico|^/$|^/login$|^/register$).*)',
  ],
}