import * as vscode from 'vscode'
import axios from 'axios'
import { code_at_cursor_instructions_for_panel } from '@/constants/instructions'
import { FilesCollector } from '@/utils/files-collector'
import {
  ModelProvidersManager,
  ApiConfiguration,
  ModelProvider,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY } from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { CodeAtCursorMessage } from '@/views/panel/types/messages'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { dictionary } from '@shared/constants/dictionary'
import { randomUUID } from 'crypto'
import { build_user_content } from '@/utils/build-user-content'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'

const get_code_at_cursor_api_configuration = async (
  api_providers_manager: ModelProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider,
  api_configuration_id?: string
): Promise<{ model_provider: ModelProvider; api_configuration: ApiConfiguration } | undefined> => {
  const code_completions_api_configurations =
    await api_providers_manager.get_api_configurations()

  if (code_completions_api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CODE_AT_CURSOR_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_api_configuration: ApiConfiguration | null = null

  if (api_configuration_id !== undefined) {
    selected_api_configuration =
      code_completions_api_configurations.find(
        (c) => get_api_configuration_id(c) == api_configuration_id
      ) || null
    if (selected_api_configuration && panel_provider) {
      panel_provider.send_message({
        command: 'SELECTED_API_CONFIGURATION_CHANGED',
        prompt_type: 'code-at-cursor',
        id: api_configuration_id
      })
    }
  } else if (!show_quick_pick) {
    const recents = context.workspaceState.get<string[]>(
      RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
    )
    const last_selected_id = recents?.[0]
    if (last_selected_id) {
      selected_api_configuration =
        code_completions_api_configurations.find(
          (c) => get_api_configuration_id(c) === last_selected_id
        ) || null
    }

    if (!selected_api_configuration && code_completions_api_configurations.length > 0) {
      selected_api_configuration = code_completions_api_configurations[0]
    }
  }

  if (!selected_api_configuration || show_quick_pick) {
    const create_items = () => {
      const recent_ids =
        context.workspaceState.get<string[]>(
          RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
        ) || []

      const matched_recent_api_configurations: ApiConfiguration[] = []
      const remaining_api_configurations: ApiConfiguration[] = []

      code_completions_api_configurations.forEach((api_configuration) => {
        const id = get_api_configuration_id(api_configuration)
        if (recent_ids.includes(id)) {
          matched_recent_api_configurations.push(api_configuration)
        } else {
          remaining_api_configurations.push(api_configuration)
        }
      })

      matched_recent_api_configurations.sort((a, b) => {
        const idA = get_api_configuration_id(a)
        const idB = get_api_configuration_id(b)
        return recent_ids.indexOf(idA) - recent_ids.indexOf(idB)
      })

      const recent_api_configurations = matched_recent_api_configurations
      const other_api_configurations = remaining_api_configurations

      const map_api_configuration_to_item = (api_configuration: ApiConfiguration) => {
        const description_parts = [api_configuration.model_provider_name]
        if (api_configuration.temperature != null) {
          description_parts.push(`${api_configuration.temperature}`)
        }
        if (api_configuration.reasoning_effort) {
          description_parts.push(`${api_configuration.reasoning_effort}`)
        }

        const buttons: vscode.QuickInputButton[] = []

        return {
          label: api_configuration.model,
          description: description_parts.join(' · '),
          buttons,
          api_configuration,
          id: get_api_configuration_id(api_configuration)
        }
      }

      const items: (vscode.QuickPickItem & {
        api_configuration?: ApiConfiguration
        id?: string
      })[] = []

      if (recent_api_configurations.length > 0) {
        items.push({
          label: 'recently used',
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(...recent_api_configurations.map(map_api_configuration_to_item))
      }

      if (other_api_configurations.length > 0) {
        if (recent_api_configurations.length > 0) {
          items.push({
            label: 'other API configurations',
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(...other_api_configurations.map(map_api_configuration_to_item))
      }

      return items
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = create_items()
    quick_pick.placeholder = 'Select code completions API configuration'
    quick_pick.matchOnDescription = true

    const items = quick_pick.items as (vscode.QuickPickItem & { id: string })[]
    if (items.length > 0) {
      const first_selectable = items.find(
        (i) => i.kind != vscode.QuickPickItemKind.Separator
      )
      if (first_selectable) {
        quick_pick.activeItems = [first_selectable]
      }
    }

    return new Promise<{ model_provider: ModelProvider; api_configuration: ApiConfiguration } | undefined>(
      (resolve) => {
        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected || !selected.api_configuration) {
            resolve(undefined)
            return
          }

          let recents =
            context.workspaceState.get<string[]>(
              RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
            ) || []
          recents = [selected.id, ...recents.filter((id) => id != selected.id)]
          context.workspaceState.update(
            RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY,
            recents
          )

          if (panel_provider) {
            panel_provider.send_message({
              command: 'SELECTED_API_CONFIGURATION_CHANGED',
              prompt_type: 'code-at-cursor',
              id: selected.id
            })
          }

          const model_provider = await api_providers_manager.get_model_provider(
            selected.api_configuration.model_provider_name
          )
          if (!model_provider) {
            vscode.window.showErrorMessage(
              dictionary.error_message.API_PROVIDER_NOT_FOUND
            )
            resolve(undefined)
            return
          }

          resolve({
            model_provider,
            api_configuration: selected.api_configuration
          })
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          if (panel_provider) {
            panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
          }
          resolve(undefined)
        })

        quick_pick.show()
      }
    )
  }

  const model_provider = await api_providers_manager.get_model_provider(
    selected_api_configuration.model_provider_name
  )

  if (!model_provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_code_at_cursor_api_configuration',
      message: 'API provider not found for Code Completions tool.'
    })
    return
  }

  return {
    model_provider,
    api_configuration: selected_api_configuration
  }
}

export const handle_code_at_cursor = async (
  panel_provider: PanelProvider,
  message: CodeAtCursorMessage
): Promise<void> => {
  const api_providers_manager = new ModelProvidersManager(
    panel_provider.context
  )
  const completion_instructions =
    panel_provider.current_code_at_cursor_instruction

  const api_configuration_result = await get_code_at_cursor_api_configuration(
    api_providers_manager,
    message.use_quick_pick,
    panel_provider.context,
    panel_provider,
    message.api_configuration_id
  )

  if (!api_configuration_result) {
    return
  }

  const { model_provider, api_configuration: code_completions_api_configuration } = api_configuration_result

  if (!code_completions_api_configuration.model_provider_name) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
    )
    Logger.warn({
      function_name: 'handle_code_at_cursor',
      message: 'API provider is not specified for Code Completions tool.'
    })
    return
  } else if (!code_completions_api_configuration.model) {
    vscode.window.showErrorMessage(
      dictionary.error_message.MODEL_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
    )
    Logger.warn({
      function_name: 'handle_code_at_cursor',
      message: 'Model is not specified for Code Completions tool.'
    })
    return
  }

  const endpoint_url = model_provider.base_url

  const editor = vscode.window.activeTextEditor
  if (editor) {
    await editor.document.save()

    if (!editor.selection.isEmpty) {
      vscode.window.showWarningMessage(
        dictionary.warning_message.CODE_AT_CURSOR_NO_SELECTION
      )
      return
    }
    const document = editor.document
    const position = editor.selection.active

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )

    const relative_path = vscode.workspace.asRelativePath(document.uri)
    const main_instructions = code_at_cursor_instructions_for_panel({
      file_path: relative_path,
      row: position.line,
      column: position.character
    })

    const {
      instruction: processed_completion_instructions,
      skill_definitions
    } = await replace_symbols({
      instruction: completion_instructions,
      context: panel_provider.context,
      workspace_provider: panel_provider.workspace_provider
    })

    const files_collector = new FilesCollector({
      workspace_provider: panel_provider.workspace_provider,
      open_editors_provider: panel_provider.open_editors_provider
    })

    const collected = await files_collector.collect_files()

    const part1 = `<files>\n${collected.other_files}`
    const part2 = `${collected.recent_files}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}${
      processed_completion_instructions
        ? `<missing_text>${processed_completion_instructions}</missing_text>`
        : '<missing_text>'
    }${text_after_cursor}\n]]>\n</file>\n</files>\n${skill_definitions}${main_instructions}`

    const user_content = build_user_content({
      model_provider_name: model_provider.name,
      part1,
      part2
    })

    const messages = [
      {
        role: 'user',
        content: user_content
      }
    ]

    const body: { [key: string]: any } = {
      messages,
      model: code_completions_api_configuration.model,
      temperature: code_completions_api_configuration.temperature
    }

    apply_reasoning_effort({
      body,
      model_provider,
      reasoning_effort: code_completions_api_configuration.reasoning_effort
    })

    let error_occurred = false

    const promises = Array.from({ length: message.invocation_count }).map(
      async () => {
        const request_id = randomUUID()

        try {
          const result = await panel_provider.api_manager.get({
            endpoint_url,
            api_key: model_provider.api_key,
            body,
            request_id,
            provider_name: code_completions_api_configuration.model_provider_name,
            model: code_completions_api_configuration.model,
            reasoning_effort: code_completions_api_configuration.reasoning_effort
          })

          if (result) {
            await vscode.commands.executeCommand(
              'codeWebChat.applyChatResponse',
              {
                response: result.response,
                raw_instructions: processed_completion_instructions,
                original_editor_state: {
                  file_path: document.uri.fsPath,
                  position: {
                    line: position.line,
                    character: position.character
                  }
                },
                recent_api_configuration: {
                  model_provider: code_completions_api_configuration.model_provider_name,
                  model: code_completions_api_configuration.model,
                  reasoning_effort: code_completions_api_configuration.reasoning_effort
                }
              }
            )
          }
        } catch (err: any) {
          if (axios.isCancel(err)) {
            return
          }
          Logger.error({
            function_name: 'handle_code_at_cursor',
            message: 'code completion error',
            data: err
          })
          if (!error_occurred) {
            vscode.window.showErrorMessage(
              dictionary.error_message.CODE_COMPLETION_ERROR
            )
            error_occurred = true
          }
        }
      }
    )

    await Promise.all(promises)
  } else {
    vscode.window.showWarningMessage(dictionary.warning_message.NO_EDITOR_OPEN)
  }
}
