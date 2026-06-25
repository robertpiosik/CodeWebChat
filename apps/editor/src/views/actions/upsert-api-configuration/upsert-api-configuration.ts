import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  ApiConfiguration,
  get_api_configuration_id,
  ModelProvider
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  initial_select_model,
  initial_select_model_provider
} from './interactions'
import { ToolType } from '@/views/settings/types/tools'

export const upsert_api_configuration = async (params: {
  context: vscode.ExtensionContext
  tool_type: ToolType
  create_on_top?: boolean
  insertion_index?: number
}): Promise<ApiConfiguration | undefined> => {
  const providers_manager = new ModelProvidersManager(params.context)
  const model_fetcher = new ModelFetcher()

  let set_default_api_configuration:
    | ((api_configuration: ApiConfiguration | null) => Promise<void>)
    | undefined

  if (params.tool_type == 'code-at-cursor') {
    set_default_api_configuration = (c) =>
      providers_manager.set_default_code_completions_api_configuration(c)
  } else if (params.tool_type == 'commit-messages') {
    set_default_api_configuration = (c) =>
      providers_manager.set_default_commit_messages_api_configuration(c)
  } else if (params.tool_type == 'intelligent-update') {
    set_default_api_configuration = (c) =>
      providers_manager.set_default_intelligent_update_api_configuration(c)
  } else if (params.tool_type == 'find-relevant-files') {
    set_default_api_configuration = (c) =>
      providers_manager.set_default_find_relevant_files_api_configuration(c)
  } else if (params.tool_type == 'voice-input') {
    set_default_api_configuration = (c) =>
      providers_manager.set_default_voice_input_api_configuration(c)
  } else if (params.tool_type !== 'edit-context') {
    throw new Error(`Unknown tool type: ${params.tool_type}`)
  }

  const api_configurations = await providers_manager.get_api_configurations()

  let actual_insertion_index: number | undefined

  if (params.insertion_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = [
          { label: 'Insert a new API configuration above' },
          { label: 'Insert a new API configuration below' }
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
    if (!position_quick_pick) return undefined

    actual_insertion_index =
      position_quick_pick == 'Insert a new API configuration above'
        ? params.insertion_index
        : params.insertion_index + 1
  }

  let selected_model_provider: ModelProvider | undefined
  let selected_model: string | undefined

  while (true) {
    selected_model_provider = await initial_select_model_provider(
      params.context,
      providers_manager,
      selected_model_provider?.name
    )
    if (!selected_model_provider) return undefined

    selected_model = await initial_select_model(
      model_fetcher,
      selected_model_provider,
      params.tool_type
    )
    if (selected_model) break
  }

  const api_configuration_to_add: ApiConfiguration = {
    model_provider_name: selected_model_provider.name,
    model: selected_model,
    temperature: undefined
  }

  const new_id = get_api_configuration_id(api_configuration_to_add)

  if (api_configurations.some((c) => get_api_configuration_id(c) === new_id)) {
    vscode.window.showErrorMessage(
      dictionary.error_message.CONFIGURATION_ALREADY_EXISTS
    )
    return undefined
  }

  if (params.create_on_top) {
    api_configurations.unshift(api_configuration_to_add)
  } else if (actual_insertion_index !== undefined) {
    api_configurations.splice(
      actual_insertion_index,
      0,
      api_configuration_to_add
    )
  } else {
    api_configurations.push(api_configuration_to_add)
  }

  await providers_manager.save_api_configurations(api_configurations)

  if (set_default_api_configuration) {
    await set_default_api_configuration(api_configuration_to_add)
  }

  return api_configuration_to_add
}
