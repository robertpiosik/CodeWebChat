import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { ReorderCommitMessagesConfigurationsMessage } from '@/views/settings/types/messages'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }`

export const handle_reorder_commit_messages_configurations = async (
  provider: SettingsProvider,
  message: ReorderCommitMessagesConfigurationsMessage
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const current_configs =
    await providers_manager.get_commit_messages_tool_configs()

  const reordered_ids = message.configurations.map((p) => p.id)

  const reordered_configs = reordered_ids
    .map((id) => {
      const found = current_configs.find((p) => generate_id(p) == id)
      if (!found) {
        console.error(`Config with id ${id} not found during reorder.`)
        return null
      }
      return found
    })
    .filter((p): p is ToolConfig => p !== null)

  if (reordered_configs.length == current_configs.length) {
    await providers_manager.save_commit_messages_tool_configs(reordered_configs)
  }
}
