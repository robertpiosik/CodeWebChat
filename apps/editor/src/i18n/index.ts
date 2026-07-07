import * as vscode from 'vscode'
import { commands } from './translations/commands'
import { translations as common } from './translations/common'
import { translations as views_settings_handlers_open_allow_patterns_settings } from './translations/views/settings/handlers/open-allow-patterns-settings'
import { translations as views_settings_handlers_open_ignore_patterns_settings } from './translations/views/settings/handlers/open-ignore-patterns-settings'
import { translations as views_settings_handlers_select_default_api_configuration } from './translations/views/settings/handlers/select-default-api-configuration'
import { translations as views_panel_handlers_voice_input } from './translations/views/panel/handlers/voice-input'
import { translations as views_handlers_common } from './translations/views/common/handlers/common'

export type TranslationKey = keyof typeof translations

const translations = {
  ...commands,
  ...common,
  ...views_settings_handlers_open_allow_patterns_settings,
  ...views_settings_handlers_open_ignore_patterns_settings,
  ...views_settings_handlers_select_default_api_configuration,
  ...views_panel_handlers_voice_input,
  ...views_handlers_common
}

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
