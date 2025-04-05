import * as vscode from 'vscode'
import { Provider } from '../types/provider'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'
import { ModelManager } from '../services/model-manager'

export type ModelType =
  | 'fim'
  | 'refactoring'
  | 'apply_changes'
  | 'commit_message'

type ModelConfig = {
  command_id: string
  display_name: string
  placeholder: string
}

const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  fim: {
    command_id: 'geminiCoder.changeDefaultFimModel',
    display_name: 'FIM',
    placeholder: 'Select default model for FIM completions'
  },
  refactoring: {
    command_id: 'geminiCoder.changeDefaultRefactoringModel',
    display_name: 'Refactoring',
    placeholder: 'Select default model for file refactoring'
  },
  apply_changes: {
    command_id: 'geminiCoder.changeDefaultApplyChangesModel',
    display_name: 'Applying Changes',
    placeholder: 'Select default model for applying changes'
  },
  commit_message: {
    command_id: 'geminiCoder.changeDefaultCommitMessageModel',
    display_name: 'Commit Messages',
    placeholder: 'Select default model for generating commit messages'
  }
}

export function change_default_model_command(
  model_type: ModelType,
  context: vscode.ExtensionContext
) {
  const config = MODEL_CONFIGS[model_type]
  const modelManager = new ModelManager(context)

  return vscode.commands.registerCommand(config.command_id, async () => {
    const userConfig = vscode.workspace.getConfiguration()
    const user_providers =
      userConfig.get<Provider[]>('geminiCoder.providers') || []
    const all_providers = [...BUILT_IN_PROVIDERS, ...user_providers]

    // Get current default model from global state
    let current_default_model: string

    switch (model_type) {
      case 'fim':
        current_default_model = modelManager.get_default_fim_model()
        break
      case 'refactoring':
        current_default_model = modelManager.get_default_refactoring_model()
        break
      case 'apply_changes':
        current_default_model = modelManager.get_default_apply_changes_model()
        break
      case 'commit_message':
        current_default_model = modelManager.get_default_commit_message_model()
        break
    }

    if (!all_providers || all_providers.length === 0) {
      vscode.window.showErrorMessage(
        'No providers configured. Please add providers in the settings.'
      )
      return
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = all_providers.map((p) => ({
      label: p.name,
      description: p.name == current_default_model ? 'Default model' : ''
    }))
    quick_pick.placeholder = config.placeholder

    // Set the active items to the current default model
    if (current_default_model) {
      const current_item = quick_pick.items.find(
        (item) => item.label === current_default_model
      )
      if (current_item) {
        quick_pick.activeItems = [current_item]
      }
    }

    quick_pick.onDidAccept(async () => {
      const selected_provider = quick_pick.selectedItems[0]?.label
      if (selected_provider) {
        // Update in global state instead of configuration
        switch (model_type) {
          case 'fim':
            await modelManager.set_default_fim_model(selected_provider)
            break
          case 'refactoring':
            await modelManager.set_default_refactoring_model(selected_provider)
            break
          case 'apply_changes':
            await modelManager.set_default_apply_changes_model(
              selected_provider
            )
            break
          case 'commit_message':
            await modelManager.set_default_commit_message_model(
              selected_provider
            )
            break
        }

        vscode.window.showInformationMessage(
          `Default ${config.display_name} model changed to: ${selected_provider}`
        )
      }
      quick_pick.dispose()
    })

    quick_pick.show()
  })
}
