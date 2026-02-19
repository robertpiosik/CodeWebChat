import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import axios from 'axios'
import { CHATBOTS } from '@shared/constants/chatbots'
import { PickModelMessage } from '@/views/panel/types/messages'

export const handle_pick_model = async (
  panel_provider: PanelProvider,
  message: PickModelMessage
): Promise<void> => {
  try {
    let items: (vscode.QuickPickItem & { model_id: string })[] = []

    if (message.chatbot_name == 'OpenRouter') {
      const response = await axios.get('https://openrouter.ai/api/v1/models')
      const models = response.data.data

      items = models.map((model: any) => ({
        label: model.name,
        model_id: model.id
      }))
    } else {
      const chatbot_config =
        CHATBOTS[message.chatbot_name as keyof typeof CHATBOTS]
      if (chatbot_config && chatbot_config.models) {
        items = Object.entries(chatbot_config.models).map(([id, data]) => ({
          label: (data as any).label || id,
          model_id: id
        }))
      }
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = items
    quick_pick.title = 'Models'
    quick_pick.placeholder = 'Choose a model'

    if (message.current_model_id) {
      const active_item = items.find(
        (i) => i.model_id === message.current_model_id
      )
      if (active_item) quick_pick.activeItems = [active_item]
    }

    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }
    ]

    quick_pick.onDidTriggerButton((button) => {
      if (button.tooltip == 'Close') {
        quick_pick.hide()
      }
    })

    return new Promise<void>((resolve) => {
      quick_pick.onDidAccept(() => {
        const selected = quick_pick.selectedItems[0] as any
        if (selected) {
          panel_provider.send_message({
            command: 'NEWLY_PICKED_MODEL',
            model_id: selected.model_id
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
  } catch (error) {
    Logger.error({
      function_name: 'handle_pick_model',
      message: 'Error picking model',
      data: error
    })
    vscode.window.showErrorMessage(
      message.chatbot_name == 'OpenRouter'
        ? dictionary.error_message.FAILED_TO_FETCH_OPEN_ROUTER_MODELS
        : 'Failed to pick model'
    )
  }
}
