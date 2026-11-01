import type { NextRequest } from 'next/server'
import { zastitiZahtjev } from '@/lib/middleware'

export async function proxy(request: NextRequest) {
  return zastitiZahtjev(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
