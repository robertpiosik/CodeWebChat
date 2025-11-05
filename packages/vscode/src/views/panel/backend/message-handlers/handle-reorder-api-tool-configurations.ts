import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ReorderApiToolConfigurationsMessage } from '@/views/panel/types/messages'
import {
  ModelProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { get_tool_config_id } from '@/services/model-providers-manager'

export const handle_reorder_api_tool_configurations = async (
  panel_provider: PanelProvider,
  message: ReorderApiToolConfigurationsMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(panel_provider.context)
  const reordered_ids = message.configurations.map((p) => p.id)

  if (message.mode === 'edit-context') {
    const current_configs =
      await providers_manager.get_edit_context_tool_configs()
    const reordered_configs = reordered_ids
      .map((id) => {
        const found = current_configs.find((p) => get_tool_config_id(p) === id)
        if (!found) {
          console.error(`Config with id ${id} not found during reorder.`)
          return null
        }
        return found
      })
      .filter((p): p is ToolConfig => p !== null)

    if (reordered_configs.length === current_configs.length) {
      await providers_manager.save_edit_context_tool_configs(reordered_configs)
    }
  } else if (message.mode === 'code-completions') {
    const current_configs =
      await providers_manager.get_code_completions_tool_configs()
    const reordered_configs = reordered_ids
      .map((id) => {
        const found = current_configs.find((p) => get_tool_config_id(p) === id)
        if (!found) {
          console.error(`Config with id ${id} not found during reorder.`)
          return null
        }
        return found
      })
      .filter((p): p is ToolConfig => p !== null)

    if (reordered_configs.length === current_configs.length) {
      await providers_manager.save_code_completions_tool_configs(
        reordered_configs
      )
    }
  }
}
