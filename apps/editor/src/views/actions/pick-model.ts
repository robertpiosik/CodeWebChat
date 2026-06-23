import * as vscode from 'vscode'
import axios from 'axios'
import { CHATBOTS } from '@shared/constants/chatbots'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'

export const pick_model = async (params: {
  chatbot_name: string
  current_model_id?: string
}): Promise<string | undefined> => {
  try {
    let items: (vscode.QuickPickItem & { model_id: string })[] = []

    if (params.chatbot_name == 'OpenRouter') {
      const response = await axios.get('https://openrouter.ai/api/v1/models')
      const models = response.data.data

      items = models.map((model: any) => ({
        label: model.name,
        model_id: model.id
      }))
    } else {
      const chatbot_config = CHATBOTS[params.chatbot_name as keyof typeof CHATBOTS]
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

    if (params.current_model_id) {
      const active_item = items.find((i) => i.model_id === params.current_model_id)
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

    return new Promise<string | undefined>((resolve) => {
      let accepted = false
      quick_pick.onDidAccept(() => {
        accepted = true
        const selected = quick_pick.selectedItems[0] as any
        quick_pick.hide()
        resolve(selected?.model_id)
      })

      quick_pick.onDidHide(() => {
        if (!accepted) resolve(undefined)
        quick_pick.dispose()
      })

      quick_pick.show()
    })
  } catch (error) {
    Logger.error({
      function_name: 'pick_model',
      message: 'Error picking model',
      data: error
    })
    vscode.window.showErrorMessage(
      params.chatbot_name == 'OpenRouter'
        ? dictionary.error_message.FAILED_TO_FETCH_OPEN_ROUTER_MODELS
        : 'Failed to pick model'
    )
    return undefined
  }
}
