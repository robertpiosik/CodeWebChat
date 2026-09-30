import * as vscode from 'vscode'
import { SetDefaultWebConfigurationMessage } from '@/views/settings/types/messages'

export const handle_set_default_web_configuration = async (
  message: SetDefaultWebConfigurationMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const web_configs = config.get<any[]>('chatbots', []) || []
  const updated = web_configs.map((c) => {
    const new_c = { ...c }
    if (message.web_feature == 'code-at-cursor') {
      if (c.name == message.web_configuration_name) {
        new_c.isDefaultForCodeAtCursor = true
      } else {
        delete new_c.isDefaultForCodeAtCursor
      }
    } else if (message.web_feature == 'patch-repair') {
      if (c.name == message.web_configuration_name) {
        new_c.isDefaultForPatchRepair = true
      } else {
        delete new_c.isDefaultForPatchRepair
      }
    } else if (message.web_feature == 'intelligent-search') {
      if (c.name == message.web_configuration_name) {
        new_c.isDefaultForIntelligentSearch = true
      } else {
        delete new_c.isDefaultForIntelligentSearch
      }
    }
    return new_c
  })
  await config.update('chatbots', updated, vscode.ConfigurationTarget.Global)
}
