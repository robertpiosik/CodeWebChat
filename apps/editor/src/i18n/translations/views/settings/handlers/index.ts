import { translations as open_allow_patterns_settings } from './open-allow-patterns-settings'
import { translations as open_ignore_patterns_settings } from './open-ignore-patterns-settings'
import { translations as select_default_api_configuration } from './select-default-api-configuration'
import { translations as handle_pick_api_reasoning_effort } from './handle-pick-api-reasoning-effort'
import { translations as handle_create_prompt_template } from './handle-create-prompt-template'

export const translations = {
  ...open_allow_patterns_settings,
  ...open_ignore_patterns_settings,
  ...select_default_api_configuration,
  ...handle_pick_api_reasoning_effort,
  ...handle_create_prompt_template
}
