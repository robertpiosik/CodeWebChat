import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { SelectDefaultConfigurationMessage } from '@/views/settings/types/messages'
import { handle_set_default_configuration } from './handle-set-default-configuration'

export const handle_select_default_configuration = async (
  provider: SettingsProvider,
  message: SelectDefaultConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const configs = await providers_manager.get_tool_configs()

  if (configs.length == 0) {
    vscode.window.showInformationMessage(
      'No configurations available. Please create one first.'
    )
    return
  }

  const items = configs.map((c) => {
    const description_parts = [c.provider_name]
    if (c.temperature != null) {
      description_parts.push(`${c.temperature}`)
    }
    if (c.reasoning_effort) {
      description_parts.push(`${c.reasoning_effort}`)
    }

    return {
      label: c.model,
      description: description_parts.join(' · '),
      config_id: get_tool_config_id(c)
    }
  })

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { config_id: string }
  >()

  quick_pick.items = items
  quick_pick.title = 'Configurations'
  quick_pick.placeholder = 'Select default configuration'
  quick_pick.matchOnDescription = true

  const close_button: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: 'Close'
  }
  quick_pick.buttons = [close_button]

  quick_pick.onDidTriggerButton((button) => {
    if (button === close_button) {
      quick_pick.hide()
    }
  })

  quick_pick.onDidAccept(async () => {
    const selected = quick_pick.selectedItems[0]
    if (selected) {
      await handle_set_default_configuration(
        provider,
        selected.config_id,
        message.tool_name
      )
    }
    quick_pick.hide()
  })

  quick_pick.onDidHide(() => quick_pick.dispose())
  quick_pick.show()
}
