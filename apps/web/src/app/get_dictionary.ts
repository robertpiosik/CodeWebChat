import { Dictionary } from '@/dictionaries/dictionary'
import { cookies, headers } from 'next/headers'
import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'

const dictionaries: { [lang: string]: () => Promise<Dictionary> } = {
  en: () => import('../dictionaries/en').then((module) => module.default),
  pl: () => import('../dictionaries/pl').then((module) => module.default)
}

export const get_dictionary = async () => {
  const cookie_locale = cookies().get('lang')?.value

  if (cookie_locale && dictionaries[cookie_locale]) {
    return dictionaries[cookie_locale]()
  } else {
    const accept_language = headers().get('accept-language') || 'en-US,en;q=0.5'
    const languages = new Negotiator({
      headers: { 'accept-language': accept_language }
    }).languages()

    const locales = ['en', 'pl']
    const default_locale = 'en'
    const preffered_locale = match(languages, locales, default_locale)

    return dictionaries[preffered_locale]()
  }
}
