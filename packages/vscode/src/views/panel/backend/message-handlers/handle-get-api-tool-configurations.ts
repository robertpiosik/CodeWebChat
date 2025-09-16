import { ViewProvider } from '@/views/panel/backend/view-provider'
import {
  ApiProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { ApiToolConfiguration } from '@/views/panel/types/messages'
import { ApiMode } from '@shared/types/modes'

export const handle_get_api_tool_configurations = async (
  provider: ViewProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)

  const [
    edit_context_configs,
    code_completions_configs,
    default_code_completions_config
  ] = await Promise.all([
    providers_manager.get_edit_context_tool_configs(),
    providers_manager.get_code_completions_tool_configs(),
    providers_manager.get_default_code_completions_config()
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
      default_config.reasoning_effort == config.reasoning_effort &&
      default_config.max_concurrency == config.max_concurrency &&
      default_config.instructions_placement == config.instructions_placement
    )
  }

  const configurations: { [T in ApiMode]?: ApiToolConfiguration[] } = {
    'edit-context': edit_context_configs,
    'code-completions': code_completions_configs.map((config) => ({
      ...config,
      is_default: is_config_default(config, default_code_completions_config)
    }))
  }

  provider.send_message({
    command: 'API_TOOL_CONFIGURATIONS',
    configurations
  })
}
