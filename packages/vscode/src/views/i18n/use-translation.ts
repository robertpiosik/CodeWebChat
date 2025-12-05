import { useContext } from 'react'
import { translations } from '@/views/i18n/translations'
import { TranslationContext } from '@/views/i18n/TranslationContext'

export type TranslationKey = keyof (typeof translations)['en']

export const use_translation = () => {
  let lang = document.documentElement.lang || 'en'
  const context_translations = useContext(TranslationContext)

  const translations_record = (
    Object.keys(context_translations).length > 0
      ? context_translations
      : translations
  ) as Record<string, Record<string, string>>

  // Fallback to generic language code if specific locale not found (e.g. 'pl-PL' -> 'pl')
  if (!translations_record[lang]) {
    lang = lang.split('-')[0]
  }

  const current_translations = translations_record[lang] || translations['en']

  const t = (key: TranslationKey): string => {
    return current_translations[key] || translations['en'][key] || key
  }

  return { t }
}
