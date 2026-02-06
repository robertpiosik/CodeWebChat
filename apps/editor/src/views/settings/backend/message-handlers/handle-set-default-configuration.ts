import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_tool_config_id,
  ToolConfig
} from '@/services/model-providers-manager'

export const handle_set_default_configuration = async (
  provider: SettingsProvider,
  configuration_id: string | null,
  type:
    | 'code-at-cursor'
    | 'intelligent-update'
    | 'commit-messages'
    | 'prune-context'
    | 'voice-input'
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)

  let get_configs: () => Promise<ToolConfig[]>
  let set_default_config: (config: ToolConfig | null) => Promise<void>

  switch (type) {
    case 'code-at-cursor':
      get_configs = () => providers_manager.get_code_completions_tool_configs()
      set_default_config = (c) =>
        providers_manager.set_default_code_completions_config(c)
      break
    case 'intelligent-update':
      get_configs = () =>
        providers_manager.get_intelligent_update_tool_configs()
      set_default_config = (c) =>
        providers_manager.set_default_intelligent_update_config(c)
      break
    case 'commit-messages':
      get_configs = () => providers_manager.get_commit_messages_tool_configs()
      set_default_config = (c) =>
        providers_manager.set_default_commit_messages_config(c)
      break
    case 'prune-context':
      get_configs = () => providers_manager.get_prune_context_tool_configs()
      set_default_config = (c) =>
        providers_manager.set_default_prune_context_config(c)
      break
    case 'voice-input':
      get_configs = () => providers_manager.get_voice_input_tool_configs()
      set_default_config = (c) =>
        providers_manager.set_default_voice_input_config(c)
      break
  }

  if (configuration_id === null) {
    await set_default_config(null)
    return
  }

  const configs = await get_configs()
  const config_to_set_as_default = configs.find(
    (c) => get_tool_config_id(c) == configuration_id
  )

  if (config_to_set_as_default) {
    await set_default_config(config_to_set_as_default)
  }
}
