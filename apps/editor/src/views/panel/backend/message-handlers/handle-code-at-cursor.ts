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
import { LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { CodeAtCursorMessage } from '@/views/panel/types/messages'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { dictionary } from '@shared/constants/dictionary'
import { randomUUID } from 'crypto'
import { build_user_content } from '@/utils/build-user-content'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'
import {
  show_configuration_quick_pick,
  map_api_configuration_to_item
} from '@/utils/show-configuration-quick-pick'
import { PromptBuilder } from '@/utils/prompt-builder'

const get_code_at_cursor_api_configuration = async (
  model_providers_manager: ModelProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider,
  api_configuration_id?: string
): Promise<
  | { model_provider: ModelProvider; api_configuration: ApiConfiguration }
  | undefined
> => {
  const code_at_cursor_api_configurations =
    await model_providers_manager.get_api_configurations()

  if (code_at_cursor_api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CODE_AT_CURSOR_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_api_configuration: ApiConfiguration | null = null

  if (api_configuration_id !== undefined) {
    selected_api_configuration =
      code_at_cursor_api_configurations.find(
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
    const last_selected_id = context.workspaceState.get<string>(
      LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY
    )
    if (last_selected_id) {
      selected_api_configuration =
        code_at_cursor_api_configurations.find(
          (c) => get_api_configuration_id(c) === last_selected_id
        ) || null
    }

    if (
      !selected_api_configuration &&
      code_at_cursor_api_configurations.length > 0
    ) {
      selected_api_configuration = code_at_cursor_api_configurations[0]
    }
  }

  if (!selected_api_configuration || show_quick_pick) {
    const last_selected_id = context.workspaceState.get<string>(
      LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY
    )

    const result = await show_configuration_quick_pick({
      items: code_at_cursor_api_configurations,
      map_item: map_api_configuration_to_item,
      last_selected_id,
      placeholder: 'Select code at cursor API configuration'
    })

    if (panel_provider) {
      panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
    }

    if (!result || result === 'back') {
      return undefined
    }

    const { item: api_configuration, id } = result

    context.workspaceState.update(
      LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY,
      id
    )

    if (panel_provider) {
      panel_provider.send_message({
        command: 'SELECTED_API_CONFIGURATION_CHANGED',
        prompt_type: 'code-at-cursor',
        id: id
      })
    }

    selected_api_configuration = api_configuration
  }

  const model_provider = await model_providers_manager.get_model_provider(
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
  const model_providers_manager = new ModelProvidersManager(
    panel_provider.context
  )
  const completion_instructions =
    panel_provider.current_code_at_cursor_instruction

  const api_configuration_result = await get_code_at_cursor_api_configuration(
    model_providers_manager,
    message.use_quick_pick,
    panel_provider.context,
    panel_provider,
    message.api_configuration_id
  )

  if (!api_configuration_result) {
    return
  }

  const {
    model_provider,
    api_configuration: code_at_cursor_api_configuration
  } = api_configuration_result

  if (!code_at_cursor_api_configuration.model_provider_name) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
    )
    Logger.warn({
      function_name: 'handle_code_at_cursor',
      message: 'API provider is not specified for Code at Cursor tool.'
    })
    return
  } else if (!code_at_cursor_api_configuration.model) {
    vscode.window.showErrorMessage(
      dictionary.error_message.MODEL_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
    )
    Logger.warn({
      function_name: 'handle_code_at_cursor',
      message: 'Model is not specified for Code at Cursor tool.'
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

    const { part1, part2 } = PromptBuilder.build_prompt({
      other_files: collected.other_files,
      recent_files: collected.recent_files,
      active_file: {
        filepath: relative_path,
        content: `${text_before_cursor}${
          processed_completion_instructions
            ? `<missing_text>${processed_completion_instructions}</missing_text>`
            : '<missing_text>'
        }${text_after_cursor}`
      },
      skill_definitions,
      system_instructions: main_instructions
    })

    const user_content = build_user_content({
      model_provider,
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
      model: code_at_cursor_api_configuration.model,
      temperature: code_at_cursor_api_configuration.temperature
    }

    apply_reasoning_effort({
      body,
      model_provider,
      reasoning_effort: code_at_cursor_api_configuration.reasoning_effort
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
            provider_name: code_at_cursor_api_configuration.model_provider_name,
            model: code_at_cursor_api_configuration.model,
            reasoning_effort: code_at_cursor_api_configuration.reasoning_effort
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
                  model_provider:
                    code_at_cursor_api_configuration.model_provider_name,
                  model: code_at_cursor_api_configuration.model,
                  reasoning_effort:
                    code_at_cursor_api_configuration.reasoning_effort
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
