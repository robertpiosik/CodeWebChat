import * as vscode from 'vscode'
import { translations as commands } from './translations/commands'
import { translations as common } from './translations/common'
import { translations as views_settings_handlers_open_allow_patterns_settings } from './translations/views/settings/handlers/open-allow-patterns-settings'
import { translations as views_settings_handlers_open_ignore_patterns_settings } from './translations/views/settings/handlers/open-ignore-patterns-settings'
import { translations as views_settings_handlers_select_default_api_configuration } from './translations/views/settings/handlers/select-default-api-configuration'
import { translations as views_prompts_handlers_voice_input } from './translations/views/prompt/handlers/voice-input'
import { translations as views_prompts_handlers_hash_sign } from './translations/views/prompt/handlers/hash-sign'
import { translations as views_prompts_handlers_select_edit_format } from './translations/views/prompt/handlers/select-edit-format'
import { translations as views_handlers_common } from './translations/views/common/handlers/common'
import { translations as views_shared_actions_api_create_interactions_verify_model } from './translations/views/shared/actions/api/create/interactions/verify-model'
import { translations as views_shared_actions_api_create_interactions_initial_select_provider } from './translations/views/shared/actions/api/create/interactions/initial-select-provider'
import { translations as views_shared_actions_api_create_interactions_initial_select_model } from './translations/views/shared/actions/api/create/interactions/initial-select-model'
import { translations as views_shared_actions_api_create_create } from './translations/views/shared/actions/api/create/create'
import { translations as views_shared_actions_api_upsert_provider } from './translations/views/shared/actions/api/upsert-provider'
import { translations as views_shared_actions_api_pick_reasoning_effort } from './translations/views/shared/actions/api/pick-reasoning-effort'
import { translations as views_shared_actions_api_update_interactions_edit_model_for_api_config } from './translations/views/shared/actions/api/update/interactions/edit-model-for-api-config'
import { translations as views_shared_actions_api_update_interactions_edit_reasoning_effort_for_api_config } from './translations/views/shared/actions/api/update/interactions/edit-reasoning-effort-for-api-config'
import { translations as views_shared_actions_web_create } from './translations/views/shared/actions/web/create'
import { translations as views_shared_actions_web_delete } from './translations/views/shared/actions/web/delete'
import { translations as views_shared_actions_web_pick_chatbot } from './translations/views/shared/actions/web/pick-chatbot'
import { translations as views_shared_actions_web_pick_model } from './translations/views/shared/actions/web/pick-model'
import { translations as views_shared_actions_web_update } from './translations/views/shared/actions/web/update'
import { translations as features } from './translations/features'
import { translations as utils_show_parent_folder_quick_pick } from './translations/utils/show-parent-folder-quick-pick'

export type TranslationKey = keyof typeof translations

const translations = {
  ...commands,
  ...common,
  ...views_settings_handlers_open_allow_patterns_settings,
  ...views_settings_handlers_open_ignore_patterns_settings,
  ...views_settings_handlers_select_default_api_configuration,
  ...views_prompts_handlers_voice_input,
  ...views_prompts_handlers_hash_sign,
  ...views_prompts_handlers_select_edit_format,
  ...views_handlers_common,
  ...views_shared_actions_api_create_interactions_verify_model,
  ...views_shared_actions_api_create_interactions_initial_select_provider,
  ...views_shared_actions_api_create_interactions_initial_select_model,
  ...views_shared_actions_api_create_create,
  ...views_shared_actions_api_upsert_provider,
  ...views_shared_actions_api_pick_reasoning_effort,
  ...views_shared_actions_api_update_interactions_edit_model_for_api_config,
  ...views_shared_actions_api_update_interactions_edit_reasoning_effort_for_api_config,
  ...views_shared_actions_web_create,
  ...views_shared_actions_web_delete,
  ...views_shared_actions_web_pick_chatbot,
  ...views_shared_actions_web_pick_model,
  ...views_shared_actions_web_update,
  ...features,
  ...utils_show_parent_folder_quick_pick
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
