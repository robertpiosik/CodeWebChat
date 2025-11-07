import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { make_api_request } from '@/utils/make-api-request'
import axios from 'axios'
import { PROVIDERS } from '@shared/constants/providers'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import { LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { EditFormat } from '@shared/types/edit-format'
import { ToolConfig } from '@/services/model-providers-manager'
import { replace_changes_placeholder } from '@/views/panel/backend/utils/replace-changes-placeholder'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import { replace_selection_placeholder } from '@/views/panel/backend/utils/replace-selection-placeholder'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { EditContextMessage } from '@/views/panel/types/messages'
import { dictionary } from '@shared/constants/dictionary'

const get_edit_context_config = async (
  api_providers_manager: ModelProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider,
  config_id?: string
): Promise<{ provider: any; config: any } | undefined> => {
  const edit_context_configs =
    await api_providers_manager.get_edit_context_tool_configs()

  if (edit_context_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_EDIT_CONTEXT_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_config: ToolConfig | null = null

  if (config_id !== undefined) {
    selected_config =
      edit_context_configs.find((c) => get_tool_config_id(c) === config_id) ||
      null
    if (selected_config) {
      context.workspaceState.update(
        LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY,
        config_id
      )
      context.globalState.update(
        LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY,
        config_id
      )

      if (panel_provider) {
        panel_provider.send_message({
          command: 'SELECTED_CONFIGURATION_CHANGED',
          mode: 'edit-context',
          id: config_id
        })
      }
    }
  } else if (!show_quick_pick) {
    const last_selected_id =
      context.workspaceState.get<string>(
        LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY
      ) ??
      context.globalState.get<string>(
        LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY
      )
    if (last_selected_id) {
      selected_config =
        edit_context_configs.find(
          (c) => get_tool_config_id(c) === last_selected_id
        ) || null
    }
  }

  if (!selected_config || show_quick_pick) {
    const create_items = async () => {
      return edit_context_configs.map((config: ToolConfig, index) => {
        const description_parts = [config.provider_name]
        if (config.temperature != DEFAULT_TEMPERATURE['edit-context']) {
          description_parts.push(`${config.temperature}`)
        }
        if (config.reasoning_effort) {
          description_parts.push(`${config.reasoning_effort}`)
        }
        if (config.instructions_placement == 'below-only') {
          description_parts.push('cache-enabled')
        }

        const buttons: vscode.QuickInputButton[] = []

        return {
          label: config.model,
          description: description_parts.join(' · '),
          buttons,
          config,
          index,
          id: get_tool_config_id(config)
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = await create_items()
    quick_pick.placeholder = 'Select configuration'
    quick_pick.matchOnDescription = true

    const last_selected_id =
      context.workspaceState.get<string>(
        LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY
      ) ??
      context.globalState.get<string>(
        LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY
      )

    const items = quick_pick.items as (vscode.QuickPickItem & { id: string })[]
    const last_selected_item = items.find(
      (item) => item.id === last_selected_id
    )

    if (last_selected_item) {
      quick_pick.activeItems = [last_selected_item]
    } else if (items.length > 0) {
      quick_pick.activeItems = [items[0]]
    }

    return new Promise<{ provider: any; config: any } | undefined>(
      (resolve) => {
        let accepted = false

        quick_pick.onDidAccept(async () => {
          accepted = true
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected) {
            resolve(undefined)
            return
          }

          context.workspaceState.update(
            LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY,
            selected.id
          )
          context.globalState.update(
            LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY,
            selected.id
          )

          if (panel_provider) {
            panel_provider.send_message({
              command: 'SELECTED_CONFIGURATION_CHANGED',
              mode: 'edit-context',
              id: selected.id
            })
          }

          const provider = await api_providers_manager.get_provider(
            selected.config.provider_name
          )
          if (!provider) {
            vscode.window.showErrorMessage(
              dictionary.error_message.API_PROVIDER_NOT_FOUND
            )
            resolve(undefined)
            return
          }

          resolve({
            provider,
            config: selected.config
          })
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          if (!accepted) {
            resolve(undefined)
          }
        })

        quick_pick.show()
      }
    )
  }

  const provider = await api_providers_manager.get_provider(
    selected_config.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_edit_context_config',
      message: 'API provider not found for Edit Context tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

const perform_context_editing = async (params: {
  context: vscode.ExtensionContext
  file_tree_provider: any
  open_editors_provider?: any
  show_quick_pick?: boolean
  instructions?: string
  config_id?: string
  panel_provider: PanelProvider
}) => {
  await vscode.workspace.saveAll()

  const api_providers_manager = new ModelProvidersManager(params.context)

  const editor = vscode.window.activeTextEditor

  const files_collector = new FilesCollector(
    params.file_tree_provider,
    params.open_editors_provider
  )

  let instructions = params.instructions

  if (!instructions) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.INSTRUCTIONS_CANNOT_BE_EMPTY
    )
    return
  }

  const has_selection =
    !!editor && !editor.selection.isEmpty && instructions.includes('#Selection')

  if (has_selection) {
    instructions = replace_selection_placeholder(instructions)
  }

  let pre_context_instructions = instructions
  let post_context_instructions = instructions

  if (pre_context_instructions.includes('#Changes:')) {
    pre_context_instructions = await replace_changes_placeholder({
      instruction: pre_context_instructions
    })
  }

  if (pre_context_instructions.includes('#SavedContext:')) {
    pre_context_instructions = await replace_saved_context_placeholder({
      instruction: pre_context_instructions,
      context: params.context,
      workspace_provider: params.file_tree_provider
    })
    post_context_instructions = await replace_saved_context_placeholder({
      instruction: post_context_instructions,
      context: params.context,
      workspace_provider: params.file_tree_provider,
      just_opening_tag: true
    })
  }

  const collected_files = await files_collector.collect_files()

  if (!collected_files) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.CONTEXT_CANNOT_BE_EMPTY
    )
    return
  }

  let current_config_id = params.config_id
  let should_show_quick_pick = params.show_quick_pick

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const config_result = await get_edit_context_config(
      api_providers_manager,
      should_show_quick_pick,
      params.context,
      params.panel_provider,
      current_config_id
    )

    if (!config_result) {
      return
    }

    const { provider, config: edit_context_config } = config_result

    if (!provider.api_key) {
      vscode.window.showErrorMessage(dictionary.error_message.API_KEY_MISSING)
      should_show_quick_pick = true
      current_config_id = undefined
      continue
    }

    let endpoint_url = ''
    if (provider.type == 'built-in') {
      const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
      if (!provider_info) {
        vscode.window.showErrorMessage(
          dictionary.error_message.BUILT_IN_PROVIDER_NOT_FOUND(provider.name)
        )
        Logger.warn({
          function_name: 'perform_context_editing',
          message: `Built-in provider "${provider.name}" not found.`
        })
        should_show_quick_pick = true
        current_config_id = undefined
        continue
      }
      endpoint_url = provider_info.base_url
    } else {
      endpoint_url = provider.base_url
    }

    const files = `<files>${collected_files}\n</files>`

    const edit_format = params.context.workspaceState.get<EditFormat>(
      'api-edit-format',
      'diff'
    )
    const all_instructions = vscode.workspace
      .getConfiguration('codeWebChat')
      .get<{ [key in EditFormat]: string }>('editFormatInstructions')
    const edit_format_instructions = all_instructions?.[edit_format] ?? ''

    let loop_pre_context_instructions = pre_context_instructions
    let loop_post_context_instructions = post_context_instructions

    if (edit_format_instructions) {
      const system_instructions = `<system>\n${edit_format_instructions}\n</system>`
      loop_pre_context_instructions += `\n${system_instructions}`
      loop_post_context_instructions += `\n${system_instructions}`
    }

    // Use instructions placement setting to determine message structure
    const instructions_placement =
      edit_context_config.instructions_placement || 'above-and-below'
    let content: string
    if (instructions_placement == 'below-only') {
      // Place instructions only below context for better caching
      content = `${files}\n${loop_post_context_instructions}`
    } else {
      // Default: place instructions above and below context for better adherence
      content = `${loop_pre_context_instructions}\n${files}\n${loop_post_context_instructions}`
    }

    const system_instructions = vscode.workspace
      .getConfiguration('codeWebChat')
      .get<string>('editContextSystemInstructions')

    const messages = [
      {
        role: 'system',
        content: system_instructions
      },
      {
        role: 'user',
        content
      }
    ]

    const body: { [key: string]: any } = {
      messages,
      model: edit_context_config.model,
      temperature: edit_context_config.temperature
    }

    apply_reasoning_effort(body, provider, edit_context_config.reasoning_effort)

    const cancel_token_source = axios.CancelToken.source()

    if (params.panel_provider) {
      params.panel_provider.api_call_cancel_token_source = cancel_token_source
    }

    try {
      if (params.panel_provider) {
        params.panel_provider.send_message({
          command: 'SHOW_PROGRESS',
          title: `${dictionary.api_call.WAITING_FOR_API_RESPONSE}...`
        })
      }
      const result = await make_api_request({
        endpoint_url,
        api_key: provider.api_key,
        body,
        cancellation_token: cancel_token_source.token,
        on_thinking_chunk: () => {
          if (params.panel_provider) {
            params.panel_provider.send_message({
              command: 'SHOW_PROGRESS',
              title: `${dictionary.api_call.THINKING}...`
            })
          }
        },
        on_chunk: (tokens_per_second) => {
          if (params.panel_provider) {
            params.panel_provider.send_message({
              command: 'SHOW_PROGRESS',
              title: 'Receiving response...',
              tokens_per_second
            })
          }
        }
      })

      if (result) {
        vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
          response: result.response,
          raw_instructions: instructions
        })
        return
      } else {
        should_show_quick_pick = true
        current_config_id = undefined
      }
    } catch (error) {
      if (axios.isCancel(error)) return
      Logger.error({
        function_name: 'perform_context_editing',
        message: 'refactor task error',
        data: error
      })
      vscode.window.showErrorMessage(dictionary.error_message.REFACTOR_ERROR)
      return
    } finally {
      params.panel_provider.send_message({ command: 'HIDE_PROGRESS' })
      params.panel_provider.api_call_cancel_token_source = null
    }
  }
}

export const handle_edit_context = async (
  panel_provider: PanelProvider,
  message: EditContextMessage
): Promise<void> => {
  perform_context_editing({
    context: panel_provider.context,
    file_tree_provider: panel_provider.workspace_provider,
    open_editors_provider: panel_provider.open_editors_provider,
    show_quick_pick: message.use_quick_pick,
    instructions: panel_provider.edit_instructions,
    config_id: message.config_id,
    panel_provider
  })
}
