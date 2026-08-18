import * as vscode from 'vscode'
import { CHATBOTS } from '@shared/constants/chatbots'
import { ConfigWebConfigurationFormat } from '@/utils/web-configuration-format-converters'
import { generate_unique_name } from '@/views/shared/utils/generate-unique-name'
import { t } from '@/i18n'

export const create = async (params: {
  reference_index?: number
}): Promise<
  { config: ConfigWebConfigurationFormat; insertion_index?: number } | undefined
> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_web_configurations =
    config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []

  let insertion_index: number | undefined

  if (params.reference_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = [
          { label: t('common.placement-above') },
          { label: t('common.placement-below') }
        ]
        quick_pick.title = t('views.shared.actions.web.create.title')
        quick_pick.placeholder = t(
          'views.shared.actions.web.create.placeholder'
        )
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
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

    if (!position_quick_pick) return undefined

    insertion_index =
      position_quick_pick == t('common.placement-above')
        ? params.reference_index
        : params.reference_index + 1
  }

  const selected_chatbot = await new Promise<keyof typeof CHATBOTS | undefined>(
    (resolve) => {
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
      quick_pick.title = t('views.shared.actions.web.create.chatbots.title')
      quick_pick.placeholder = t(
        'views.shared.actions.web.create.chatbots.placeholder'
      )
      quick_pick.buttons = [
        {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: t('common.close')
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
          const chatbot = quick_pick.selectedItems[0]
            ?.label as keyof typeof CHATBOTS
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
    }
  )

  if (!selected_chatbot) return undefined

  const new_name = generate_unique_name(
    undefined,
    current_web_configurations.map((c) => c.name)
  )

  const new_web_configuration: ConfigWebConfigurationFormat = {
    name: new_name,
    chatbot: selected_chatbot,
    systemInstructions: CHATBOTS[selected_chatbot].supports_system_instructions
      ? CHATBOTS[selected_chatbot].default_system_instructions
      : undefined
  }

  return { config: new_web_configuration, insertion_index }
}
