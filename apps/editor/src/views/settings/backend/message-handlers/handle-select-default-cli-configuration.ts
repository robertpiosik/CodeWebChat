import * as vscode from 'vscode'
import { SelectDefaultAgentConfigurationMessage } from '@/views/settings/types/messages'
import { t } from '@/i18n'

export const handle_select_default_cli_configuration = async (
  message: SelectDefaultAgentConfigurationMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const agent_configs = config.get<any[]>('agents', []) || []
  if (agent_configs.length === 0) return

  const items = agent_configs.map((c) => {
    const is_unnamed = /^\(\d+\)$/.test(c.name.trim())
    const display_name = is_unnamed ? c.agent : c.name.replace(/ \(\d+\)$/, '')

    const description_parts = []
    if (c.agent !== display_name) {
      description_parts.push(c.agent)
    }
    if (c.flags) {
      description_parts.push(
        Array.isArray(c.flags) ? c.flags.join(' ') : c.flags
      )
    }

    return {
      label: display_name,
      description:
        description_parts.length > 0 ? description_parts.join(' ') : undefined,
      cli_configuration_name: c.name
    }
  })

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { cli_configuration_name: string }
  >()
  quick_pick.items = items
  quick_pick.title = t('common.title.agents')
  quick_pick.placeholder = t('common.placeholder.select-agent')

  const close_button: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }
  quick_pick.buttons = [close_button]

  quick_pick.onDidTriggerButton((button) => {
    if (button === close_button) {
      quick_pick.hide()
    }
  })

  quick_pick.onDidAccept(async () => {
    const selected = quick_pick.selectedItems[0]
    quick_pick.hide()

    if (selected) {
      const updated = agent_configs.map((c) => {
        const new_c = { ...c }
        if (message.cli_feature == 'agentic-search') {
          if (c.name == selected.cli_configuration_name) {
            new_c.isDefaultForAgenticSearch = true
          } else {
            delete new_c.isDefaultForAgenticSearch
          }
        } else if (message.cli_feature == 'code-at-cursor') {
          if (c.name == selected.cli_configuration_name) {
            new_c.isDefaultForCodeAtCursor = true
          } else {
            delete new_c.isDefaultForCodeAtCursor
          }
        }
        return new_c
      })
      await config.update('agents', updated, vscode.ConfigurationTarget.Global)
    }
  })

  quick_pick.onDidHide(() => quick_pick.dispose())
  quick_pick.show()
}
