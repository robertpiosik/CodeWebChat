import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { CHATBOTS } from '@shared/constants/chatbots'
import { PickChatbotMessage } from '@/views/panel/types/messages'

export const handle_pick_chatbot = async (
  panel_provider: PanelProvider,
  message: PickChatbotMessage
): Promise<void> => {
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

  if (message.chatbot_id) {
    const active_item = items.find((item) => item.label == message.chatbot_id)
    if (active_item) {
      quick_pick.activeItems = [active_item]
    }
  }

  quick_pick.onDidTriggerButton((button) => {
    if (button.tooltip === 'Close') {
      quick_pick.hide()
    }
  })

  return new Promise<void>((resolve) => {
    quick_pick.onDidAccept(() => {
      const selected = quick_pick.selectedItems[0]
      if (selected) {
        panel_provider.send_message({
          command: 'NEWLY_PICKED_CHATBOT',
          chatbot_id: selected.label
        })
      }
      quick_pick.hide()
    })

    quick_pick.onDidHide(() => {
      quick_pick.dispose()
      resolve()
    })

    quick_pick.show()
  })
}
