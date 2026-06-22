import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { ConfigWebConfigurationFormat } from '@/views/utils/web-configuration-format-converters'
import { generate_unique_name } from './generate-unique-name'


export const duplicate_web_configuration = async (params: {
  index: number
}): Promise<void> => {
  const original_index = params.index
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
    current_web_configurations.map(c => c.name)
  )

  const duplicated_web_configuration = {
    ...web_configuration_to_duplicate,
    name: new_name
  }

  const updated_web_configurations = [...current_web_configurations]
  updated_web_configurations.splice(original_index + 1, 0, duplicated_web_configuration)

  try {
    await config.update('webConfigurations', updated_web_configurations, true)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_DUPLICATE_PRESET(error)
    )
  }
}
