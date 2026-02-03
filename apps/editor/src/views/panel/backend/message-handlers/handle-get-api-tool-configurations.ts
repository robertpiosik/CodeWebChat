import { PanelProvider } from '@/views/panel/backend/panel-provider'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { ApiToolConfiguration } from '@/views/panel/types/messages'
import { ApiPromptType } from '@shared/types/prompt-types'

export const handle_get_api_tool_configurations = async (
  panel_provider: PanelProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(panel_provider.context)

  const [
    edit_context_configs,
    code_completions_configs,
    default_code_completions_config,
    prune_context_configs
  ] = await Promise.all([
    providers_manager.get_edit_context_tool_configs(),
    providers_manager.get_code_completions_tool_configs(),
    providers_manager.get_default_code_completions_config(),
    providers_manager.get_prune_context_tool_configs()
  ])

  const is_config_default = (
    config: ToolConfig,
    default_config: ToolConfig | undefined
  ): boolean => {
    if (!default_config) return false
    return (
      default_config.provider_type == config.provider_type &&
      default_config.provider_name == config.provider_name &&
      default_config.model == config.model &&
      default_config.temperature == config.temperature &&
      default_config.reasoning_effort == config.reasoning_effort
    )
  }

  const configurations: { [T in ApiPromptType]?: ApiToolConfiguration[] } = {
    'edit-context': edit_context_configs.map((config) => ({
      ...config,
      id: get_tool_config_id(config)
    })),
    'code-at-cursor': code_completions_configs.map((config) => ({
      ...config,
      id: get_tool_config_id(config),
      is_default: is_config_default(config, default_code_completions_config)
    })),
    'prune-context': prune_context_configs.map((config) => ({
      ...config,
      id: get_tool_config_id(config)
    }))
  }

  panel_provider.send_message({
    command: 'API_TOOL_CONFIGURATIONS',
    configurations
  })
}
