import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { ConfigWebConfigurationFormat } from '@/utils/web-configuration-format-converters'
import { t } from '@/i18n'

export const remove = async (params: { name: string }): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_web_configurations =
    config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []

  const index = current_web_configurations.findIndex(
    (c, i) => (c.name ?? `unnamed-${i}`) == params.name
  )

  if (index < 0 || index >= current_web_configurations.length) {
    return
  }

  const item_to_delete = current_web_configurations[index]
  const item_name = item_to_delete.name
  const is_unnamed = !item_name || /^\(\d+\)$/.test(item_name?.trim() ?? '')
  const display_item_name = is_unnamed
    ? t('views.shared.actions.web.delete.unnamed')
    : item_name!

  const delete_button = t('common.delete')
  const result = await vscode.window.showWarningMessage(
    dictionary.warning_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: is_unnamed
        ? dictionary.warning_message.CONFIRM_DELETE_ITEM('configuration')
        : dictionary.warning_message.CONFIRM_DELETE_NAMED_ITEM(
            'web configuration',
            display_item_name
          )
    },
    delete_button
  )

  if (result != delete_button) {
    return
  }

  const updated_web_configurations = [...current_web_configurations]
  updated_web_configurations.splice(index, 1)

  try {
    await config.update(
      'webConfigurations',
      updated_web_configurations,
      vscode.ConfigurationTarget.Global
    )

    const undo_action = t('common.undo')
    const choice = await vscode.window.showInformationMessage(
      t('views.shared.actions.web.delete.deleted'),
      undo_action
    )

    if (choice === undo_action) {
      const current_config = vscode.workspace.getConfiguration('codeWebChat')
      const current_web_configs =
        current_config.get<ConfigWebConfigurationFormat[]>(
          'webConfigurations',
          []
        ) || []
      current_web_configs.splice(index, 0, item_to_delete)
      await current_config.update(
        'webConfigurations',
        current_web_configs,
        vscode.ConfigurationTarget.Global
      )
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_DELETE_ITEM('web configuration', error)
    )
  }
}
