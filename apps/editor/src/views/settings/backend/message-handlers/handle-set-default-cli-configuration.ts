import * as vscode from 'vscode'
import { SetDefaultAgentConfigurationMessage } from '@/views/settings/types/messages'

export const handle_set_default_cli_configuration = async (
  message: SetDefaultAgentConfigurationMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const agent_configs = config.get<any[]>('agents', []) || []
  const updated = agent_configs.map((c) => {
    const new_c = { ...c }
    if (message.cli_feature == 'agentic-search') {
      if (c.name == message.cli_configuration_name) {
        new_c.isDefaultForAgenticSearch = true
      } else {
        delete new_c.isDefaultForAgenticSearch
      }
    } else if (message.cli_feature == 'code-at-cursor') {
      if (c.name == message.cli_configuration_name) {
        new_c.isDefaultForCodeAtCursor = true
      } else {
        delete new_c.isDefaultForCodeAtCursor
      }
    } else if (message.cli_feature == 'intelligent-search') {
      if (c.name == message.cli_configuration_name) {
        new_c.isDefaultForIntelligentSearch = true
      } else {
        delete new_c.isDefaultForIntelligentSearch
      }
    } else if (message.cli_feature == 'patch-repair') {
      if (c.name == message.cli_configuration_name) {
        new_c.isDefaultForPatchRepair = true
      } else {
        delete new_c.isDefaultForPatchRepair
      }
    }
    return new_c
  })
  await config.update('agents', updated, vscode.ConfigurationTarget.Global)
}
