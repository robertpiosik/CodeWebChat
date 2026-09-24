import * as vscode from 'vscode'
import { ConfigAgentConfigurationFormat } from '@/utils/cli-configuration-format-converters'
import { t } from '@/i18n'
import { get_error_message } from '@/utils/get-error-message'

export const remove = async (params: { name: string }): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_agent_configurations =
    config.get<ConfigAgentConfigurationFormat[]>('agents', []) || []

  const index = current_agent_configurations.findIndex(
    (c) => c.name == params.name
  )

  if (index < 0 || index >= current_agent_configurations.length) {
    return
  }

  const item_to_delete = current_agent_configurations[index]
  const item_name = item_to_delete.name
  const is_unnamed = /^\(\d+\)$/.test(item_name.trim())
  const display_item_name = is_unnamed
    ? t('views.shared.actions.agent.delete.unnamed')
    : item_name

  const delete_button = t('common.delete')
  const result = await vscode.window.showWarningMessage(
    t('common.confirm-action'),
    {
      modal: true,
      detail: is_unnamed
        ? t('common.confirm-delete-item', { item: 'agent' })
        : t('common.confirm-delete-named-item', {
            item: 'agent',
            name: display_item_name
          })
    },
    delete_button
  )

  if (result != delete_button) {
    return
  }

  const updated_agent_configurations = [...current_agent_configurations]
  updated_agent_configurations.splice(index, 1)

  try {
    await config.update(
      'agents',
      updated_agent_configurations,
      vscode.ConfigurationTarget.Global
    )

    const undo_action = t('common.undo')
    const choice = await vscode.window.showInformationMessage(
      t('common.success.item-deleted', { item: 'Agent' }),
      undo_action
    )

    if (choice === undo_action) {
      const current_config = vscode.workspace.getConfiguration('codeWebChat')
      const current_agent_configs =
        current_config.get<ConfigAgentConfigurationFormat[]>('agents', []) || []
      current_agent_configs.splice(index, 0, item_to_delete)
      await current_config.update(
        'agents',
        current_agent_configs,
        vscode.ConfigurationTarget.Global
      )
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      t('common.error.failed-to-delete-item', {
        item_type: 'agent',
        error: get_error_message(error)
      })
    )
  }
}