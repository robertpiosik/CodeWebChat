import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { ConfigurationForClient } from '@/views/settings/types/messages'
import { ToolType } from '@/views/settings/types/tools'

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
  type: ToolType
}): Promise<void> => {
  const providers_manager = new ModelProvidersManager(params.provider.context)

  let saved_configs: ToolConfig[] = []
  let default_config: ToolConfig | undefined
  let command: string

  if (params.type == 'code-at-cursor') {
    saved_configs = await providers_manager.get_code_completions_tool_configs()
    default_config =
      await providers_manager.get_default_code_completions_config()
    command = 'CODE_AT_CURSOR_CONFIGURATIONS'
  } else if (params.type == 'edit-context') {
    saved_configs = await providers_manager.get_edit_context_tool_configs()
    command = 'EDIT_CONTEXT_CONFIGURATIONS'
  } else if (params.type == 'intelligent-update') {
    saved_configs =
      await providers_manager.get_intelligent_update_tool_configs()
    default_config =
      await providers_manager.get_default_intelligent_update_config()
    command = 'INTELLIGENT_UPDATE_CONFIGURATIONS'
  } else if (params.type == 'commit-messages') {
    saved_configs = await providers_manager.get_commit_messages_tool_configs()
    default_config =
      await providers_manager.get_default_commit_messages_config()
    command = 'COMMIT_MESSAGES_CONFIGURATIONS'
  } else if (params.type == 'prune-context') {
    saved_configs = await providers_manager.get_prune_context_tool_configs()
    command = 'PRUNE_CONTEXT_CONFIGURATIONS'
  } else if (params.type == 'voice-input') {
    saved_configs = await providers_manager.get_voice_input_tool_configs()
    default_config = await providers_manager.get_default_voice_input_config()
    command = 'VOICE_INPUT_CONFIGURATIONS'
  } else {
    throw new Error(`Unknown tool type: ${params.type}`)
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
