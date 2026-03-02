import React, { createContext, useContext } from 'react'

export const TranslationContext = createContext<
  Record<string, Record<string, string>>
>({})

type ExtractPlaceholders<S extends string> =
  S extends `${string}{${infer Key}}${infer Rest}`
    ? Key | ExtractPlaceholders<Rest>
    : never

export function create_translation<
  T extends Record<string, Record<string, string>>
>(translations: T) {
  type PlaceholdersForKey<K extends keyof T> = ExtractPlaceholders<
    T[K]['en'] extends string ? T[K]['en'] : string
  >

  type TranslationProps<K extends keyof T> = [PlaceholdersForKey<K>] extends [
    never
  ]
    ? { id: K; components?: never }
    : { id: K; components: Record<PlaceholdersForKey<K>, React.ReactNode> }

  const use_translation = () => {
    const lang = document.documentElement.lang || 'en'
    const context_translations = useContext(TranslationContext)

    const translations_record = (
      Object.keys(context_translations).length > 0
        ? context_translations
        : translations
    ) as Record<string, Record<string, string>>

    const t = (key: keyof T): string => {
      const item =
        translations_record[key as string] || translations[key as string]
      if (!item) return key as string

      if (item[lang]) return item[lang]

      const short_lang = lang.split('-')[0]
      if (item[short_lang]) return item[short_lang]

      return item['en'] || (key as string)
    }

    return { t }
  }

  const Translation = <K extends keyof T>(params: TranslationProps<K>) => {
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

  return { use_translation, Translation }
}
