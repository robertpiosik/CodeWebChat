import { ViewProvider } from '@/view/backend/view-provider'
import { ApiProvidersManager } from '@/services/api-providers-manager'
import { ApiToolConfiguration, ExtensionMessage } from '@/view/types/messages'
import { ApiMode } from '@shared/types/modes'

export const handle_get_api_tool_configurations = async (
  provider: ViewProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)

  const configs = await Promise.all([
    providers_manager.get_edit_context_tool_configs(),
    providers_manager.get_code_completions_tool_configs()
  ])

  const configurations: { [T in ApiMode]?: ApiToolConfiguration[] } = {
    'edit-context': configs[0],
    'code-completions': configs[1]
  }

  provider.send_message<ExtensionMessage>({
    command: 'API_TOOL_CONFIGURATIONS',
    configurations
  })
}
