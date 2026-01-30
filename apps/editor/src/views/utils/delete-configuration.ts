import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_tool_config_id,
  ToolConfig
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'

export const delete_configuration = async (
  context: vscode.ExtensionContext,
  configuration_id: string,
  type:
    | 'code-at-cursor'
    | 'edit-context'
    | 'intelligent-update'
    | 'commit-messages'
    | 'prune-context'
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(context)

  let get_configs: () => Promise<ToolConfig[]>
  let save_configs: (configs: ToolConfig[]) => Promise<void>
  let get_default_config: (() => Promise<ToolConfig | undefined>) | undefined
  let set_default_config:
    | ((config: ToolConfig | null) => Promise<void>)
    | undefined

  switch (type) {
    case 'code-at-cursor':
      get_configs = () => providers_manager.get_code_completions_tool_configs()
      save_configs = (c) =>
        providers_manager.save_code_completions_tool_configs(c)
      get_default_config = () =>
        providers_manager.get_default_code_completions_config()
      set_default_config = (c) =>
        providers_manager.set_default_code_completions_config(c)
      break
    case 'edit-context':
      get_configs = () => providers_manager.get_edit_context_tool_configs()
      save_configs = (c) => providers_manager.save_edit_context_tool_configs(c)
      break
    case 'intelligent-update':
      get_configs = () =>
        providers_manager.get_intelligent_update_tool_configs()
      save_configs = (c) =>
        providers_manager.save_intelligent_update_tool_configs(c)
      get_default_config = () =>
        providers_manager.get_default_intelligent_update_config()
      set_default_config = (c) =>
        providers_manager.set_default_intelligent_update_config(c)
      break
    case 'commit-messages':
      get_configs = () => providers_manager.get_commit_messages_tool_configs()
      save_configs = (c) =>
        providers_manager.save_commit_messages_tool_configs(c)
      get_default_config = () =>
        providers_manager.get_default_commit_messages_config()
      set_default_config = (c) =>
        providers_manager.set_default_commit_messages_config(c)
      break
    case 'prune-context':
      get_configs = () => providers_manager.get_prune_context_tool_configs()
      save_configs = (c) => providers_manager.save_prune_context_tool_configs(c)
      get_default_config = () =>
        providers_manager.get_default_prune_context_config()
      set_default_config = (c) =>
        providers_manager.set_default_prune_context_config(c)
      break
    default:
      throw new Error(`Unknown tool type: ${type}`)
  }

  const original_configs = await get_configs()
  const config_to_delete = original_configs.find(
    (c) => get_tool_config_id(c) === configuration_id
  )
  if (!config_to_delete) return

  const confirmation = await vscode.window.showWarningMessage(
    dictionary.warning_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: dictionary.warning_message.CONFIRM_DELETE_CONFIGURATION(
        config_to_delete.model,
        config_to_delete.provider_name
      )
    },
    'Delete'
  )

  if (confirmation != 'Delete') {
    return
  }

  const updated_configs = original_configs.filter(
    (c) => get_tool_config_id(c) !== configuration_id
  )
  await save_configs(updated_configs)

  if (get_default_config && set_default_config) {
    const original_default_config = await get_default_config()
    if (
      original_default_config &&
      get_tool_config_id(original_default_config) === configuration_id
    ) {
      await set_default_config(null)
    }
  }
}
