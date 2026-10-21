import { translations as handle_open_allow_patterns_settings } from './handle-open-allow-patterns-settings'
import { translations as handle_open_ignore_patterns_settings } from './handle-open-ignore-patterns-settings'
import { translations as handle_select_default_api_configuration } from './handle-select-default-api-configuration'
import { translations as handle_create_template } from './handle-create-template'
import { translations as handle_delete_template } from './handle-delete-template'
import { translations as handle_delete_provider } from './handle-delete-provider'
import { translations as handle_select_default_web_configuration } from './handle-select-default-web-configuration'
import { translations as handle_select_default_cli_configuration } from './handle-select-default-cli-configuration'

export const translations = {
  ...handle_open_allow_patterns_settings,
  ...handle_open_ignore_patterns_settings,
  ...handle_select_default_api_configuration,
  ...handle_create_template,
  ...handle_delete_template,
  ...handle_delete_provider,
  ...handle_select_default_web_configuration,
  ...handle_select_default_cli_configuration
}
