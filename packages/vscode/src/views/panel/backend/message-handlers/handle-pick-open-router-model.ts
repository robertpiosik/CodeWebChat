import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import axios from 'axios'

export const handle_pick_open_router_model = async (
  provider: PanelProvider
): Promise<void> => {
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models')
    const models = response.data.data

    const items: vscode.QuickPickItem[] = models.map((model: any) => ({
      label: model.name,
      description: model.id,
      detail: model.description
    }))

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Select Open Router Model',
      placeHolder: 'Choose a model from Open Router'
    })

    if (selected) {
      provider.send_message({
        command: 'NEWLY_PICKED_OPEN_ROUTER_MODEL',
        model_id: selected.description!
      })
    }
  } catch (error) {
    console.error('Error fetching Open Router models:', error)
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_FETCH_OPEN_ROUTER_MODELS
    )
  }
}
