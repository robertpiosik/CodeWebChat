import * as vscode from 'vscode'
import { CHATBOTS } from '@shared/constants/chatbots'

export const pick_chatbot = async (params: {
  current_chatbot_id?: string
}): Promise<keyof typeof CHATBOTS | undefined> => {
  const chatbots = Object.entries(CHATBOTS)

  const items: vscode.QuickPickItem[] = chatbots.map(([chatbot, { url }]) => ({
    label: chatbot,
    description:
      chatbot == 'Open WebUI'
        ? 'localhost'
        : url.replace(/^https?:\/\//, '').split('/')[0]
  }))

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.title = 'Chatbots'
  quick_pick.placeholder = 'Choose a chatbot'
  quick_pick.buttons = [
    {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: 'Close'
    }
  ]

  if (params.current_chatbot_id) {
    const active_item = items.find(
      (item) => item.label == params.current_chatbot_id
    )
    if (active_item) {
      quick_pick.activeItems = [active_item]
    }
  }

  quick_pick.onDidTriggerButton((button) => {
    if (button.tooltip === 'Close') {
      quick_pick.hide()
    }
  })

  return new Promise<keyof typeof CHATBOTS | undefined>((resolve) => {
    let accepted = false
    quick_pick.onDidAccept(() => {
      accepted = true
      const selected = quick_pick.selectedItems[0]?.label as
        | keyof typeof CHATBOTS
        | undefined
      quick_pick.hide()
      resolve(selected)
    })

    quick_pick.onDidHide(() => {
      if (!accepted) resolve(undefined)
      quick_pick.dispose()
    })

    quick_pick.show()
  })
}
