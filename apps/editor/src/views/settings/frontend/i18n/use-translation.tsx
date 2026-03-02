import {
  create_translation,
  TranslationContext
} from '../../../hooks/use-translation'
import { translations } from './translations/index'

export { TranslationContext }

export type TranslationKey = keyof typeof translations

export const { use_translation, Translation } = create_translation(translations)
