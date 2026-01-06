import { NextResponse } from "next/server"
import { withAuth } from "next-auth/middleware"
import { getToken } from "next-auth/jwt"

// Cache for maintenance mode to reduce API calls
let maintenanceModeCache: {
  value: boolean | null
  timestamp: number
} = {
  value: null,
  timestamp: 0
}

const MAINTENANCE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now()
  
  // Return cached value if still valid
  if (maintenanceModeCache.value !== null && 
      now - maintenanceModeCache.timestamp < MAINTENANCE_CACHE_TTL) {
    return maintenanceModeCache.value
  }

  try {
    const settingsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/settings`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json()
      const isMaintenance = settings.maintenanceMode || false
      
      // Update cache
      maintenanceModeCache = {
        value: isMaintenance,
        timestamp: now
      }
      
      return isMaintenance
    }
  } catch (error) {
    console.error('Error checking maintenance mode:', error)
  }
  
  // Default to false if we can't determine maintenance mode
  return false
}

export default withAuth(
  async function middleware(req) {
    const token = await getToken({ req })
    const { pathname } = req.nextUrl

    // Skip maintenance check for auth-related paths and login page
    const isAuthPath = pathname.startsWith('/api/auth') || 
                      pathname === '/' || 
                      pathname === '/register'
    const isAdminPath = pathname.startsWith('/admin')

    // If maintenance mode is enabled, check user access
    if (!isAuthPath && !isAdminPath) {
      const isMaintenance = await getMaintenanceMode()
      
      if (isMaintenance) {
        // Only allow admin users to access non-admin pages during maintenance
        if (!token || token.role !== 'ADMIN') {
          // Redirect to login page with maintenance message
          const loginUrl = new URL('/', req.url)
          loginUrl.searchParams.set('error', 'maintenance')
          return NextResponse.redirect(loginUrl)
        }
      }
    }

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
      // Allow unauthorized access to login page and register page
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        // Allow access to login and register pages without authentication
        if (pathname === '/' || pathname === '/register') {
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}