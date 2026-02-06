import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { ConfigurationForClient } from '@/views/settings/types/messages'

const create_description = (config: ToolConfig): string => {
  const description_parts = [config.provider_name]
  if (config.temperature != null) {
    description_parts.push(`${config.temperature}`)
  }
  if (config.reasoning_effort) {
    description_parts.push(`${config.reasoning_effort}`)
  }
  return description_parts.join(' · ')
}

export const handle_get_configurations = async (params: {
  provider: SettingsProvider
  type:
    | 'code-at-cursor'
    | 'edit-context'
    | 'intelligent-update'
    | 'commit-messages'
    | 'prune-context'
    | 'voice-input'
}): Promise<void> => {
  const providers_manager = new ModelProvidersManager(params.provider.context)

  let saved_configs: ToolConfig[] = []
  let default_config: ToolConfig | undefined
  let command: string

  switch (params.type) {
    case 'code-at-cursor':
      saved_configs =
        await providers_manager.get_code_completions_tool_configs()
      default_config =
        await providers_manager.get_default_code_completions_config()
      command = 'CODE_AT_CURSOR_CONFIGURATIONS'
      break
    case 'edit-context':
      saved_configs = await providers_manager.get_edit_context_tool_configs()
      command = 'EDIT_CONTEXT_CONFIGURATIONS'
      break
    case 'intelligent-update':
      saved_configs =
        await providers_manager.get_intelligent_update_tool_configs()
      default_config =
        await providers_manager.get_default_intelligent_update_config()
      command = 'INTELLIGENT_UPDATE_CONFIGURATIONS'
      break
    case 'commit-messages':
      saved_configs = await providers_manager.get_commit_messages_tool_configs()
      default_config =
        await providers_manager.get_default_commit_messages_config()
      command = 'COMMIT_MESSAGES_CONFIGURATIONS'
      break
    case 'prune-context':
      saved_configs = await providers_manager.get_prune_context_tool_configs()
      command = 'PRUNE_CONTEXT_CONFIGURATIONS'
      break
    case 'voice-input':
      saved_configs = await providers_manager.get_voice_input_tool_configs()
      default_config = await providers_manager.get_default_voice_input_config()
      command = 'VOICE_INPUT_CONFIGURATIONS'
      break
  }

  const default_config_id = default_config
    ? get_tool_config_id(default_config)
    : null

  const configs_for_client: ConfigurationForClient[] = saved_configs.map(
    (config) => {
      return {
        id: get_tool_config_id(config),
        model: config.model,
        description: create_description(config),
        is_default: get_tool_config_id(config) === default_config_id
      }
    }
  )

  params.provider.postMessage({
    command,
    configurations: configs_for_client
  } as any)
}
