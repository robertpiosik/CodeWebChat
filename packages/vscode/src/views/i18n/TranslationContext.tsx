import { createContext } from 'react'

export const TranslationContext = createContext<
  Record<string, Record<string, string>>
>({})
