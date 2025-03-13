import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('next-auth.session-token')
  
  if (!authCookie) {
    return NextResponse.redirect(new URL('/api/auth/signin', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/chat/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
} 