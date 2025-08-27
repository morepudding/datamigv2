import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  console.log('🛣️ Middleware - Route:', request.nextUrl.pathname);
  console.log('🌐 Middleware - Host:', request.nextUrl.host);
  
  // Laisser passer toutes les requêtes sans modification
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|test-static.html).*)',
  ],
}
