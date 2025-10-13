import * as vscode from 'vscode'
import { ViewProvider } from '@/views/panel/backend/panel-provider'
import { CHATBOTS } from '@shared/constants/chatbots'
import { PickChatbotMessage } from '@/views/panel/types/messages'

export const handle_pick_chatbot = async (
  provider: ViewProvider,
  message: PickChatbotMessage
): Promise<void> => {
  const chatbots = Object.entries(CHATBOTS)

  const items: vscode.QuickPickItem[] = chatbots.map(([chatbot, { url }]) => ({
    label: chatbot,
    description: chatbot == 'Open WebUI' ? 'localhost' : url,
    buttons: [
      ...(chatbot != 'Open WebUI'
        ? [
            {
              iconPath: new vscode.ThemeIcon('link-external'),
              tooltip: 'Open in Browser'
            }
          ]
        : [])
    ]
  }))

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.title = 'Select a Chatbot'
  quick_pick.placeholder = 'Choose a chatbot from the list'

  if (message.chatbot_id) {
    const active_item = items.find((item) => item.label == message.chatbot_id)
    if (active_item) {
      quick_pick.activeItems = [active_item]
    }
  }

  quick_pick.onDidTriggerItemButton((e) => {
    const chatbot_name = e.item.label
    const chatbot_details = CHATBOTS[chatbot_name as keyof typeof CHATBOTS]
    if (chatbot_details) {
      vscode.env.openExternal(vscode.Uri.parse(chatbot_details.url))
    }
  })

  return new Promise<void>((resolve) => {
    quick_pick.onDidAccept(() => {
      const selected = quick_pick.selectedItems[0]
      if (selected) {
        provider.send_message({
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
