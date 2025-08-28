import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple logging pour debug
  console.log('🛣️ Route middleware:', request.nextUrl.pathname);
  
  // Laisser passer toutes les requêtes
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|test-static.html).*)',
  ],
}
