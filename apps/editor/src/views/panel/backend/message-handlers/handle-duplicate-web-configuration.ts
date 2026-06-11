import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { DuplicateWebConfigurationMessage } from '@/views/panel/types/messages'
import { ConfigWebConfigurationFormat } from '@/views/panel/backend/utils/web-configuration-format-converters'

const generate_unique_name = (
  base_name: string | undefined,
  all_web_configurations: ConfigWebConfigurationFormat[]
): string => {
  const web_configuration_name = base_name ?? ''

  const parenthetical_match = web_configuration_name.match(/^(.*?)(?:\s*\((\d+)\))?$/)
  const original_base_name = parenthetical_match?.[1]?.trim()
  const existing_number_str = parenthetical_match?.[2]

  const base_for_duplication =
    existing_number_str !== undefined && original_base_name !== undefined
      ? original_base_name
      : web_configuration_name.trim()

  let copy_number =
    existing_number_str !== undefined
      ? parseInt(existing_number_str, 10) + 1
      : 1

  let new_name = base_for_duplication
    ? `${base_for_duplication} (${copy_number})`
    : `(${copy_number})`

  while (all_web_configurations.some((p) => p.name == new_name)) {
    copy_number++
    new_name = base_for_duplication
      ? `${base_for_duplication} (${copy_number})`
      : `(${copy_number})`
  }
  return new_name
}
export const handle_duplicate_web_configuration = async (
  panel_provider: PanelProvider,
  message: DuplicateWebConfigurationMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const original_index = message.index
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_web_configurations =
    config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []

  if (original_index < 0 || original_index >= current_web_configurations.length) {
    vscode.window.showErrorMessage(
      dictionary.error_message.PRESET_NOT_FOUND(`at index ${original_index}`)
    )
    return
  }

  const web_configuration_to_duplicate = current_web_configurations[original_index]

  const new_name = generate_unique_name(
    web_configuration_to_duplicate.name,
    current_web_configurations
  )

  const duplicated_web_configuration = {
    ...web_configuration_to_duplicate,
    name: new_name
  }

  const updated_web_configurations = [...current_web_configurations]
  updated_web_configurations.splice(original_index + 1, 0, duplicated_web_configuration)

  try {
    await config.update('webConfigurations', updated_web_configurations, true)
    panel_provider.send_web_configurations_to_webview(webview_view.webview)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_DUPLICATE_PRESET(error)
    )
  }
}
