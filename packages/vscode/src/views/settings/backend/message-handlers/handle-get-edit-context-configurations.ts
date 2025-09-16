import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { ConfigurationForClient } from '@/views/settings/types/messages'
import { SupportedTool, DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'

const TOOL: SupportedTool = 'edit-context'

const create_description = (config: ToolConfig): string => {
  const description_parts = [config.provider_name]
  if (config.temperature != DEFAULT_TEMPERATURE[TOOL]) {
    description_parts.push(`${config.temperature}`)
  }
  if (config.reasoning_effort) {
    description_parts.push(`${config.reasoning_effort}`)
  }
  if (config.instructions_placement == 'below-only') {
    description_parts.push('cache-enabled')
  }
  return description_parts.join(' · ')
}

export const handle_get_edit_context_configurations = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const saved_configs = await providers_manager.get_edit_context_tool_configs()

  const configs_for_client: ConfigurationForClient[] = saved_configs.map(
    (config) => {
      return {
        id: `${config.provider_name}:${config.model}:${config.temperature}:${
          config.reasoning_effort ?? ''
        }:${config.instructions_placement ?? ''}`,
        model: config.model,
        description: create_description(config),
        is_default: false // edit-context has no default
      }
    }
  )

  provider.postMessage({
    command: 'EDIT_CONTEXT_CONFIGURATIONS',
    configurations: configs_for_client
  })
}
