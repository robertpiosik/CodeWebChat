import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { ToolType } from '@/views/settings/types/tools'

export const handle_reorder_configuration = async (
  provider: SettingsProvider,
  configurations: { id: string }[],
  type: ToolType
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)

  let get_configs: () => Promise<ToolConfig[]>
  let save_configs: (configs: ToolConfig[]) => Promise<void>

  if (type == 'code-at-cursor') {
    get_configs = () => providers_manager.get_code_completions_tool_configs()
    save_configs = (c) =>
      providers_manager.save_code_completions_tool_configs(c)
  } else if (type == 'edit-context') {
    get_configs = () => providers_manager.get_edit_context_tool_configs()
    save_configs = (c) => providers_manager.save_edit_context_tool_configs(c)
  } else if (type == 'intelligent-update') {
    get_configs = () => providers_manager.get_intelligent_update_tool_configs()
    save_configs = (c) =>
      providers_manager.save_intelligent_update_tool_configs(c)
  } else if (type == 'commit-messages') {
    get_configs = () => providers_manager.get_commit_messages_tool_configs()
    save_configs = (c) => providers_manager.save_commit_messages_tool_configs(c)
  } else if (type == 'prune-context') {
    get_configs = () => providers_manager.get_prune_context_tool_configs()
    save_configs = (c) => providers_manager.save_prune_context_tool_configs(c)
  } else if (type == 'voice-input') {
    get_configs = () => providers_manager.get_voice_input_tool_configs()
    save_configs = (c) => providers_manager.save_voice_input_tool_configs(c)
  } else {
    throw new Error(`Unknown tool type: ${type}`)
  }

  const current_configs = await get_configs()

  const reordered_ids = configurations.map((p) => p.id)

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
    await save_configs(reordered_configs)
  }
}
