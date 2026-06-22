import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  ConfigWebConfigurationFormat
} from './web-configuration-format-converters'

export const create_web_configuration = async (params: {
  placement?: 'top' | 'bottom'
  reference_index?: number
}): Promise<ConfigWebConfigurationFormat | undefined> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_web_configurations =
    config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []

  let insertion_index: number | undefined

  if (params.reference_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>((resolve) => {
      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = [
        { label: 'Insert a new item above' },
        { label: 'Insert a new item below' }
      ]
      quick_pick.title = 'Placement'
      quick_pick.placeholder = 'Where to insert?'
      quick_pick.buttons = [
        {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: 'Close'
        }
      ]

      let accepted = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton(() => {
          quick_pick.hide()
        }),
        quick_pick.onDidAccept(() => {
          accepted = true
          resolve(quick_pick.selectedItems[0]?.label)
          quick_pick.hide()
        }),
        quick_pick.onDidHide(() => {
          if (!accepted) resolve(undefined)
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )

      quick_pick.show()
    })

    if (!position_quick_pick) return undefined

    insertion_index =
      position_quick_pick == 'Insert a new item above'
        ? params.reference_index
        : params.reference_index + 1
  } else if (params.placement == 'top') {
    insertion_index = 0
  }

  const selected_chatbot = await new Promise<keyof typeof CHATBOTS | undefined>((resolve) => {
    const chatbots = Object.entries(CHATBOTS)
    const items: vscode.QuickPickItem[] = chatbots.map(([chatbot, { url }]) => ({
      label: chatbot,
      description:
        chatbot == 'Open WebUI' ? 'localhost' : url.replace(/^https?:\/\//, '').split('/')[0]
    }))

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = items
    quick_pick.title = 'Chatbots'
    quick_pick.placeholder = 'Choose a chatbot for the new web configuration'
    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }
    ]

    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      quick_pick.onDidTriggerButton(() => {
        quick_pick.hide()
      }),
      quick_pick.onDidAccept(() => {
        accepted = true
        const chatbot = quick_pick.selectedItems[0]?.label as keyof typeof CHATBOTS
        quick_pick.hide()
        resolve(chatbot)
      }),
      quick_pick.onDidHide(() => {
        if (!accepted) resolve(undefined)
        disposables.forEach((d) => d.dispose())
        quick_pick.dispose()
      })
    )

    quick_pick.show()
  })

  if (!selected_chatbot) return undefined

  let copy_number = 0
  let new_name: string
  do {
    new_name = `(${copy_number++})`
  } while (current_web_configurations.some((p) => p.name == new_name))

  const new_web_configuration: ConfigWebConfigurationFormat = {
    name: new_name,
    chatbot: selected_chatbot,
    model: Object.keys(CHATBOTS[selected_chatbot].models ?? {})[0],
    systemInstructions: CHATBOTS[selected_chatbot].supports_system_instructions
      ? CHATBOTS[selected_chatbot].default_system_instructions
      : undefined
  }

  const updated_web_configurations = [...current_web_configurations]
  if (insertion_index !== undefined) {
    updated_web_configurations.splice(insertion_index, 0, new_web_configuration)
  } else {
    updated_web_configurations.push(new_web_configuration)
  }

  try {
    await config.update('webConfigurations', updated_web_configurations, true)
    return new_web_configuration
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_CREATE_ITEM('Web Configuration', error)
    )
    return undefined
  }
}
