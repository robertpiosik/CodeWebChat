import * as vscode from 'vscode'
import { translations } from './translations'

export type TranslationKey = keyof typeof translations

export const t = (
  key: TranslationKey,
  placeholders?: Record<string, string | number>
): string => {
  const item = translations[key]
  if (!item) return key

  const lang = vscode.env.language || 'en'

  let text: string = item[lang as keyof typeof item]

  if (!text) {
    const short_lang = lang.split('-')[0]
    text = item[short_lang as keyof typeof item]
  }

  if (!text) {
    text = item['en'] || key
  }

  if (placeholders) {
    for (const [k, v] of Object.entries(placeholders)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }

  return text
}
