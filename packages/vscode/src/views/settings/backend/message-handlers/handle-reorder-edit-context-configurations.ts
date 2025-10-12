import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { ReorderEditContextConfigurationsMessage } from '@/views/settings/types/messages'

export const handle_reorder_edit_context_configurations = async (
  provider: SettingsProvider,
  message: ReorderEditContextConfigurationsMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const current_configs =
    await providers_manager.get_edit_context_tool_configs()

  const reordered_ids = message.configurations.map((p) => p.id)

  const reordered_configs = reordered_ids
    .map((id) => {
      const found = current_configs.find((p) => get_tool_config_id(p) == id)
      if (!found) {
        console.error(`Config with id ${id} not found during reorder.`)
        return null
      }
      return found
    })
    .filter((p): p is ToolConfig => p !== null)

  if (reordered_configs.length == current_configs.length) {
    await providers_manager.save_edit_context_tool_configs(reordered_configs)
  }
}
