import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  config_web_configuration_to_ui_format,
  ConfigWebConfigurationFormat
} from '@/views/utils/web-configuration-format-converters'
import { CreateWebConfigurationMessage } from '@/views/panel/types/messages'

const ITEM_NAME_WEB_CONFIGURATION = 'Web Configuration'

const create_web_configuration = async (params: {
  panel_provider: PanelProvider
  insertion_index?: number
  chatbot: keyof typeof CHATBOTS
}) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_web_configurations =
    config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []

  let copy_number = 0
  let new_name: string
  do {
    new_name = `(${copy_number++})`
  } while (current_web_configurations.some((p) => p.name == new_name))

  const new_web_configuration: ConfigWebConfigurationFormat = {
    name: new_name,
    chatbot: params.chatbot,
    model: Object.keys(CHATBOTS[params.chatbot].models ?? {})[0],
    systemInstructions: CHATBOTS[params.chatbot].supports_system_instructions
      ? CHATBOTS[params.chatbot].default_system_instructions
      : undefined
  }

  const updated_web_configurations = [...current_web_configurations]
  if (params.insertion_index !== undefined) {
    updated_web_configurations.splice(params.insertion_index, 0, new_web_configuration)
  } else {
    updated_web_configurations.push(new_web_configuration)
  }

  try {
    params.panel_provider.send_message({
      command: 'WEB_CONFIGURATION_CREATED',
      web_configuration: config_web_configuration_to_ui_format(new_web_configuration)
    })
    await config.update('webConfigurations', updated_web_configurations, true)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_CREATE_ITEM(ITEM_NAME_WEB_CONFIGURATION, error)
    )
  }
}

export const handle_create_web_configuration = async (
  panel_provider: PanelProvider,
  message: CreateWebConfigurationMessage
): Promise<void> => {
  let insertion_index: number | undefined

  if (message.reference_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
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
      }
    )
    if (!position_quick_pick) return

    insertion_index =
      position_quick_pick == 'Insert a new item above'
        ? message.reference_index
        : message.reference_index + 1
  } else if (message.placement == 'top') {
    insertion_index = 0
  }

  const show_chatbots_menu = () => {
    const chatbots = Object.entries(CHATBOTS)
    const items: vscode.QuickPickItem[] = chatbots.map(
      ([chatbot, { url }]) => ({
        label: chatbot,
        description:
          chatbot == 'Open WebUI'
            ? 'localhost'
            : url.replace(/^https?:\/\//, '').split('/')[0]
      })
    )

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

    const disposables: vscode.Disposable[] = []

    disposables.push(
      quick_pick.onDidTriggerButton(() => {
          quick_pick.hide()
      }),
      quick_pick.onDidAccept(async () => {
        const selected_chatbot = quick_pick.selectedItems[0]
          ?.label as keyof typeof CHATBOTS
        quick_pick.hide()
        if (selected_chatbot) {
          await create_web_configuration({
            panel_provider,
            insertion_index,
            chatbot: selected_chatbot
          })
        }
      }),
      quick_pick.onDidHide(() => {
        disposables.forEach((d) => d.dispose())
        quick_pick.dispose()
      })
    )

    quick_pick.show()
  }

  show_chatbots_menu()
}
