import React, { useContext } from 'react'
import { translations } from '@/views/i18n/translations'
import { TranslationContext } from '@/views/i18n/TranslationContext'

type ExtractPlaceholders<S extends string> =
  S extends `${string}{${infer Key}}${infer Rest}`
    ? Key | ExtractPlaceholders<Rest>
    : never

type PlaceholdersForKey<K extends TranslationKey> = ExtractPlaceholders<
  (typeof translations)[K]['en']
>

type TransProps<K extends TranslationKey> = [PlaceholdersForKey<K>] extends [
  never
]
  ? { id: K; components?: never }
  : { id: K; components: Record<PlaceholdersForKey<K>, React.ReactNode> }

export type TranslationKey = keyof typeof translations

export const use_translation = () => {
  const lang = document.documentElement.lang || 'en'
  const context_translations = useContext(TranslationContext)

  const translations_record = (
    Object.keys(context_translations).length > 0
      ? context_translations
      : translations
  ) as Record<string, Record<string, string>>

  const t = (key: TranslationKey): string => {
    const item = translations_record[key] || translations[key]
    if (!item) return key

    if (item[lang]) return item[lang]

    const short_lang = lang.split('-')[0]
    if (item[short_lang]) return item[short_lang]

    return item['en'] || key
  }

  return { t }
}

export const Translation = <K extends TranslationKey>(
  params: TransProps<K>
) => {
  const components = params.components ?? {}
  const { t } = use_translation()
  const text = t(params.id)
  const parts = text.split(/(\{.*?\})/)

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\{(.*?)\}$/)
        if (
          match &&
          (components as Record<string, React.ReactNode>)[match[1]]
        ) {
          return (
            <React.Fragment key={i}>
              {(components as Record<string, React.ReactNode>)[match[1]]}
            </React.Fragment>
          )
        }
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </>
  )
}
