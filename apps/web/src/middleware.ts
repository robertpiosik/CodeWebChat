import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'

export function middleware(request: NextRequest) {
  const current_lang = request.cookies.get('lang')

  if (current_lang) {
    return NextResponse.next()
  } else {
    const accept_language =
      request.headers.get('accept-language') || 'en-US,en;q=0.5'
    const languages = new Negotiator({
      headers: { 'accept-language': accept_language }
    }).languages()

    const locales = ['en', 'pl']
    const default_locale = 'en'
    const preffered_locale = match(languages, locales, default_locale)

    const response = NextResponse.next()
    response.cookies.set('lang', preffered_locale, {
      expires: new Date(Date.now() + 31536000000) // A year from now
    })

    return response
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
