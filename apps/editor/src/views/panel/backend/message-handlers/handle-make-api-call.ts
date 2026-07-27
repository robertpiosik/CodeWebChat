import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ModelProvider,
  ApiConfiguration
} from '@/services/model-providers-manager'
import axios from 'axios'
import {
  API_EDIT_FORMAT_STATE_KEY,
  LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY,
  LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY,
  LAST_USED_FIND_RELEVANT_FILES_CONFIG_ID_STATE_KEY,
  FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY
} from '@/constants/state-keys'
import { EditFormat } from '@shared/types/edit-format'
import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { MakeApiCallMessage } from '@/views/panel/types/messages'
import { dictionary } from '@shared/constants/dictionary'
import {
  code_at_cursor_instructions_for_panel,
  find_relevant_files_instructions,
  find_relevant_files_format_for_panel
} from '@/constants/instructions'
import { default_system_instructions } from '@shared/constants/default-system-instructions'
import { build_user_content } from '@/utils/build-user-content'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'
import {
  show_configuration_quick_pick,
  map_api_configuration_to_item
} from '@/utils/show-configuration-quick-pick'
import { PromptBuilder } from '@/utils/prompt-builder'
import { randomUUID } from 'crypto'
import { ApiPromptType } from '@shared/types/prompt-types'
import {
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'

const get_last_used_config_id_key = (prompt_type: ApiPromptType) => {
  if (prompt_type == 'code-at-cursor')
    return LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY
  if (prompt_type == 'find-relevant-files')
    return LAST_USED_FIND_RELEVANT_FILES_CONFIG_ID_STATE_KEY
  return LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY
}

const get_api_configuration = async (params: {
  model_providers_manager: ModelProvidersManager
  show_quick_pick?: boolean
  extension_context: vscode.ExtensionContext
  panel_view_provider: PanelViewProvider
  api_configuration_id?: string
  prompt_type: ApiPromptType
}): Promise<
  | { model_provider: ModelProvider; api_configuration: ApiConfiguration }
  | undefined
> => {
  const api_configurations =
    await params.model_providers_manager.get_api_configurations()

  if (api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    let message =
      dictionary.information_message.NO_EDIT_FILES_CONFIGURATIONS_FOUND
    if (params.prompt_type == 'code-at-cursor') {
      message =
        dictionary.information_message.NO_CODE_AT_CURSOR_CONFIGURATIONS_FOUND
    } else if (params.prompt_type == 'find-relevant-files') {
      message =
        dictionary.information_message
          .NO_FIND_RELEVANT_FILES_CONFIGURATIONS_FOUND
    }
    vscode.window.showInformationMessage(message)
    return
  }

  const last_used_key = get_last_used_config_id_key(params.prompt_type)
  let selected_api_configuration: ApiConfiguration | null = null

  if (params.api_configuration_id !== undefined) {
    selected_api_configuration =
      api_configurations.find(
        (c) => get_api_configuration_id(c) == params.api_configuration_id
      ) || null
    if (selected_api_configuration) {
      params.extension_context.workspaceState.update(
        last_used_key,
        params.api_configuration_id
      )

      if (params.panel_view_provider) {
        params.panel_view_provider.send_message({
          command: 'SELECTED_API_CONFIGURATION_CHANGED',
          prompt_type: params.prompt_type,
          id: params.api_configuration_id
        })
      }
    }
  } else if (!params.show_quick_pick) {
    const last_selected_id =
      params.extension_context.workspaceState.get<string>(last_used_key)

    if (last_selected_id) {
      selected_api_configuration =
        api_configurations.find(
          (c) => get_api_configuration_id(c) == last_selected_id
        ) || null
    }

    if (
      !selected_api_configuration &&
      params.prompt_type == 'code-at-cursor' &&
      api_configurations.length > 0
    ) {
      selected_api_configuration = api_configurations[0]
    }
  }

  if (!selected_api_configuration || params.show_quick_pick) {
    const last_selected_id =
      params.extension_context.workspaceState.get<string>(last_used_key)

    const result = await show_configuration_quick_pick({
      items: api_configurations,
      map_item: map_api_configuration_to_item,
      last_selected_id,
      placeholder:
        params.prompt_type == 'code-at-cursor'
          ? 'Select code at cursor API configuration'
          : undefined
    })

    if (params.panel_view_provider) {
      params.panel_view_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
    }

    if (!result || result == 'back') {
      return undefined
    }

    const { item: api_configuration, id } = result
    params.extension_context.workspaceState.update(last_used_key, id)

    if (params.panel_view_provider) {
      params.panel_view_provider.send_message({
        command: 'SELECTED_API_CONFIGURATION_CHANGED',
        prompt_type: params.prompt_type,
        id: id
      })
    }
    selected_api_configuration = api_configuration
  }

  const model_provider =
    await params.model_providers_manager.get_model_provider(
      selected_api_configuration.model_provider_name
    )

  if (!model_provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_api_configuration',
      message: `API provider not found for ${params.prompt_type} tool.`
    })
    return
  }

  return {
    model_provider,
    api_configuration: selected_api_configuration
  }
}

export const handle_make_api_call = async (
  panel_view_provider: PanelViewProvider,
  message: MakeApiCallMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const { prompt_type } = message
  const model_providers_manager = new ModelProvidersManager(
    panel_view_provider.extension_context
  )

  let instructions = ''
  if (prompt_type == 'edit-files') {
    instructions = panel_view_provider.current_edit_files_instruction
  } else if (prompt_type == 'code-at-cursor') {
    instructions = panel_view_provider.current_code_at_cursor_instruction
  } else if (prompt_type == 'find-relevant-files') {
    instructions = panel_view_provider.current_find_relevant_files_instruction
  }

  if (!instructions && prompt_type != 'code-at-cursor') {
    panel_view_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Instructions cannot be empty',
      type: 'warning'
    })
    return
  }

  const { instruction: processed_instructions, skill_definitions } =
    await replace_symbols({
      instruction: instructions,
      extension_context: panel_view_provider.extension_context,
      workspace_provider: panel_view_provider.workspace_provider
    })

  const files_collector = new FilesCollector({
    workspace_provider: panel_view_provider.workspace_provider,
    open_editors_provider: panel_view_provider.open_editors_provider
  })

  const shrink_source_code =
    prompt_type == 'find-relevant-files'
      ? panel_view_provider.extension_context.workspaceState.get<boolean>(
          FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
          false
        )
      : false

  const collected = await files_collector.collect_files({
    shrink: shrink_source_code
  })
  const collected_files = collected.other_files + collected.recent_files

  if (!collected_files && prompt_type != 'code-at-cursor') {
    panel_view_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Context cannot be empty',
      type: 'warning'
    })
    return
  }

  const editor = vscode.window.activeTextEditor
  if (prompt_type == 'code-at-cursor') {
    if (!editor) {
      vscode.window.showWarningMessage(
        dictionary.warning_message.NO_EDITOR_OPEN
      )
      return
    }
    if (!editor.selection.isEmpty) {
      vscode.window.showWarningMessage(
        dictionary.warning_message.CODE_AT_CURSOR_NO_SELECTION
      )
      return
    }
  }

  let current_api_configuration_id = message.api_configuration_id
  let should_show_quick_pick = message.use_quick_pick

  while (true) {
    const api_configuration_result = await get_api_configuration({
      model_providers_manager,
      show_quick_pick: should_show_quick_pick,
      extension_context: panel_view_provider.extension_context,
      panel_view_provider,
      api_configuration_id: current_api_configuration_id,
      prompt_type
    })

    if (!api_configuration_result) {
      return
    }

    panel_view_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })

    const { model_provider, api_configuration } = api_configuration_result

    if (prompt_type == 'code-at-cursor') {
      if (!api_configuration.model_provider_name) {
        vscode.window.showErrorMessage(
          dictionary.error_message.API_PROVIDER_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
        )
        Logger.warn({
          function_name: 'handle_make_api_call',
          message: 'API provider is not specified for Code at Cursor tool.'
        })
        return
      } else if (!api_configuration.model) {
        vscode.window.showErrorMessage(
          dictionary.error_message.MODEL_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
        )
        Logger.warn({
          function_name: 'handle_make_api_call',
          message: 'Model is not specified for Code at Cursor tool.'
        })
        return
      }
    }

    let edit_format: EditFormat = 'whole'
    let system_instructions = ''
    let user_content = ''

    if (prompt_type == 'edit-files') {
      edit_format =
        panel_view_provider.extension_context.workspaceState.get<EditFormat>(
          API_EDIT_FORMAT_STATE_KEY
        ) ??
        panel_view_provider.extension_context.globalState.get<EditFormat>(
          API_EDIT_FORMAT_STATE_KEY
        ) ??
        'whole'
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const instructions_key = {
        whole: 'editFormatInstructionsWhole',
        truncated: 'editFormatInstructionsTruncated',
        diff: 'editFormatInstructionsDiff',
        'search-replace': 'editFormatInstructionsSearchReplace'
      }[edit_format]
      const default_instructions = {
        whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
        truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
        diff: EDIT_FORMAT_INSTRUCTIONS_DIFF,
        'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE
      }[edit_format]
      const edit_format_instructions =
        config.get<string>(instructions_key) || default_instructions

      let formatted_system_instructions = ''
      if (edit_format_instructions) {
        formatted_system_instructions = `# System\n\n${edit_format_instructions}`
      }

      system_instructions =
        vscode.workspace
          .getConfiguration('codeWebChat')
          .get<string>('editFilesSystemInstructions') ||
        default_system_instructions

      const { part1, part2 } = PromptBuilder.build_prompt({
        other_files: collected.other_files,
        recent_files: collected.recent_files,
        skill_definitions,
        system_instructions: formatted_system_instructions,
        user_instructions: processed_instructions
      })
      user_content = build_user_content({ model_provider, part1, part2 })
    } else if (prompt_type == 'find-relevant-files') {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const base_instructions =
        config.get<string>('findRelevantFilesInstructions') ||
        find_relevant_files_instructions

      const { part1, part2 } = PromptBuilder.build_prompt({
        other_files: collected.other_files,
        recent_files: collected.recent_files,
        skill_definitions,
        system_instructions: find_relevant_files_format_for_panel,
        user_instructions: `${base_instructions}\n\n${processed_instructions}`
      })
      user_content = build_user_content({
        model_provider,
        part1,
        part2,
        disable_cache: true
      })
    } else if (prompt_type == 'code-at-cursor') {
      const document = editor!.document
      const position = editor!.selection.active

      const text_before_cursor = document.getText(
        new vscode.Range(new vscode.Position(0, 0), position)
      )
      const text_after_cursor = document.getText(
        new vscode.Range(
          position,
          document.positionAt(document.getText().length)
        )
      )
      const relative_path = vscode.workspace.asRelativePath(document.uri)
      const main_instructions = code_at_cursor_instructions_for_panel({
        file_path: relative_path,
        row: position.line,
        column: position.character
      })

      const { part1, part2 } = PromptBuilder.build_prompt({
        other_files: collected.other_files,
        recent_files: collected.recent_files,
        active_file: {
          filepath: relative_path,
          content: `${text_before_cursor}${
            processed_instructions
              ? `<missing_text>${processed_instructions}</missing_text>`
              : '<missing_text>'
          }${text_after_cursor}`
        },
        skill_definitions,
        system_instructions: main_instructions
      })
      user_content = build_user_content({ model_provider, part1, part2 })
    }

    const messages = [
      ...(system_instructions
        ? [{ role: 'system', content: system_instructions }]
        : []),
      { role: 'user', content: user_content }
    ]

    let error_occurred = false
    let was_cancelled = false

    const promises = Array.from({ length: message.invocation_count }).map(
      async () => {
        const request_id = randomUUID()
        const body: { [key: string]: any } = {
          messages,
          model: api_configuration.model,
          temperature: api_configuration.temperature
        }

        apply_reasoning_effort({
          body,
          model_provider,
          reasoning_effort: api_configuration.reasoning_effort
        })

        try {
          const result = await panel_view_provider.api_manager.send_llm_message(
            {
              base_url: model_provider.base_url,
              api_key: model_provider.api_key,
              body,
              request_id,
              provider_name: api_configuration.model_provider_name,
              model: api_configuration.model,
              reasoning_effort: api_configuration.reasoning_effort
            }
          )

          if (result) {
            const recent_api_configuration = {
              model_provider: api_configuration.model_provider_name,
              model: api_configuration.model,
              reasoning_effort: api_configuration.reasoning_effort
            }

            if (prompt_type == 'edit-files') {
              vscode.commands.executeCommand('codeWebChat.applyResponse', {
                response: result.response,
                raw_instructions: instructions,
                edit_format,
                recent_api_configuration
              })
            } else if (prompt_type == 'find-relevant-files') {
              vscode.commands.executeCommand('codeWebChat.applyResponse', {
                response: result.response,
                raw_instructions: instructions,
                recent_api_configuration
              })
            } else if (prompt_type == 'code-at-cursor') {
              const document = editor!.document
              const position = editor!.selection.active
              await vscode.commands.executeCommand(
                'codeWebChat.applyResponse',
                {
                  response: result.response,
                  raw_instructions: processed_instructions,
                  original_editor_state: {
                    file_path: document.uri.fsPath,
                    position: {
                      line: position.line,
                      character: position.character
                    }
                  },
                  recent_api_configuration
                }
              )
            }
            return true
          }
        } catch (error) {
          if (axios.isCancel(error)) {
            was_cancelled = true
            return false
          }
          Logger.error({
            function_name: 'handle_make_api_call',
            message: `${prompt_type} task error`,
            data: error
          })
          if (!error_occurred) {
            let err_msg = dictionary.error_message.EDIT_FILES_ERROR
            if (prompt_type == 'code-at-cursor')
              err_msg = dictionary.error_message.CODE_COMPLETION_ERROR
            else if (prompt_type == 'find-relevant-files')
              err_msg = 'Find relevant files error. See console for details.'
            vscode.window.showErrorMessage(err_msg)
            error_occurred = true
          }
          return false
        }
        return false
      }
    )

    const results = await Promise.all(promises)

    if (error_occurred || was_cancelled) return

    if (results.some((r) => r)) {
      return
    } else {
      should_show_quick_pick = true
      current_api_configuration_id = undefined
    }
  }
}
