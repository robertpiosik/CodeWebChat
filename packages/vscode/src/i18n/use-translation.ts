import { translations } from '@/i18n/translations'

export type TranslationKey = keyof (typeof translations)['en']

export const use_translation = () => {
  let lang = document.documentElement.lang || 'en'

  const translations_record = translations as Record<
    string,
    Record<string, string>
  >

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
