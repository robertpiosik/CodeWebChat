import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import {
  code_at_cursor_instructions_for_panel,
  find_relevant_files_instructions,
  find_relevant_files_format_for_panel
} from '@/constants/instructions'
import {
  get_last_used_web_configuration_key,
  FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY
} from '@/constants/state-keys'
import { ConfigWebConfigurationFormat } from '@/utils/web-configuration-format-converters'
import { MODE } from '@/views/panel/types/main-view-mode'
import { WebPromptType } from '@shared/types/prompt-types'
import { CHATBOTS } from '@shared/constants/chatbots'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { handle_update_last_used_web_configuration_or_group } from './handle-update-last-used-web-configuration-or-group'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'
import { show_configuration_quick_pick } from '@/utils/show-configuration-quick-pick'
import { PromptBuilder } from '@/utils/prompt-builder'

export const handle_autofill = async (params: {
  panel_view_provider: PanelViewProvider
  invocation_count: number
  web_configuration_name?: string
  show_quick_pick?: boolean
}): Promise<void> => {
  if (
    params.panel_view_provider.mode == MODE.WEB &&
    !params.panel_view_provider.websocket_server_instance.is_connected_with_browser()
  ) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.BROWSER_EXTENSION_NOT_CONNECTED
    )
    return
  }

  const is_in_code_at_cursor_mode =
    params.panel_view_provider.web_prompt_type == 'code-at-cursor'
  const current_instructions = params.panel_view_provider.current_instruction

  const active_editor = vscode.window.activeTextEditor

  if (is_in_code_at_cursor_mode && !active_editor) {
    vscode.window.showWarningMessage(dictionary.warning_message.NO_EDITOR_OPEN)
    return
  }

  const resolution = await resolve_web_configuration({
    panel_view_provider: params.panel_view_provider,
    web_configuration_name: params.web_configuration_name,
    extension_context: params.panel_view_provider.extension_context,
    show_quick_pick: params.show_quick_pick
  })

  if (!resolution.web_configuration_name) {
    return
  }
  const resolved_web_configuration_name = resolution.web_configuration_name

  if (params.web_configuration_name !== undefined) {
    handle_update_last_used_web_configuration_or_group({
      panel_view_provider: params.panel_view_provider,
      web_configuration_name: params.web_configuration_name
    })
  }

  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector({
    workspace_provider: params.panel_view_provider.workspace_provider,
    open_editors_provider: params.panel_view_provider.open_editors_provider
  })

  let sent = false

  if (is_in_code_at_cursor_mode) {
    const document = active_editor!.document
    const position = active_editor!.selection.active

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )
    const {
      instruction: processed_completion_instructions,
      skill_definitions
    } = await replace_symbols({
      instruction: current_instructions,
      extension_context: params.panel_view_provider.extension_context,
      workspace_provider: params.panel_view_provider.workspace_provider,
      remove_images: true
    })

    const collected = await files_collector.collect_files()
    const context_text = collected.other_files + collected.recent_files

    const relative_path = vscode.workspace.asRelativePath(document.uri)

    const main_instructions = code_at_cursor_instructions_for_panel({
      file_path: relative_path,
      row: position.line,
      column: position.character
    })

    const { full_prompt: text } = PromptBuilder.build_prompt({
      context_text,
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

    sent =
      await params.panel_view_provider.websocket_server_instance.initialize_chat(
        {
          text,
          web_configuration_name: resolved_web_configuration_name,
          raw_instructions: processed_completion_instructions,
          prompt_type: params.panel_view_provider.web_prompt_type,
          invocation_count: params.invocation_count
        }
      )
  } else {
    const additional_paths: string[] = []

    const shrink_source_code =
      params.panel_view_provider.extension_context.workspaceState.get<boolean>(
        FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
        false
      )

    const collected = await files_collector.collect_files({
      additional_paths,
      no_context: params.panel_view_provider.web_prompt_type == 'without-files',
      shrink:
        params.panel_view_provider.web_prompt_type == 'find-relevant-files' &&
        shrink_source_code
    })
    const context_text = collected.other_files + collected.recent_files

    const { instruction: processed_instructions, skill_definitions } =
      await replace_symbols({
        instruction: current_instructions,
        extension_context: params.panel_view_provider.extension_context,
        workspace_provider: params.panel_view_provider.workspace_provider,
        remove_images: true
      })

    let formatted_system_instructions = ''
    let user_instructions = processed_instructions
    if (params.panel_view_provider.web_prompt_type == 'edit-files') {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const instructions_key = {
        whole: 'editFormatInstructionsWhole',
        truncated: 'editFormatInstructionsTruncated',
        'search-replace': 'editFormatInstructionsSearchReplace',
        diff: 'editFormatInstructionsDiff'
      }[params.panel_view_provider.chat_edit_format]
      const default_instructions = {
        whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
        truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
        'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
        diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
      }[params.panel_view_provider.chat_edit_format]
      const edit_format_instructions =
        config.get<string>(instructions_key) || default_instructions
      if (edit_format_instructions) {
        formatted_system_instructions = `# System\n\n${edit_format_instructions}`
      }
    } else if (
      params.panel_view_provider.web_prompt_type == 'find-relevant-files'
    ) {
      formatted_system_instructions = find_relevant_files_format_for_panel

      const config = vscode.workspace.getConfiguration('codeWebChat')
      const base_instructions =
        config.get<string>('findRelevantFilesInstructions') ||
        find_relevant_files_instructions
      user_instructions = `${base_instructions}\n\n${processed_instructions}`
    }

    const { full_prompt: text } = PromptBuilder.build_prompt({
      context_text,
      skill_definitions,
      system_instructions: formatted_system_instructions,
      user_instructions
    })

    sent =
      await params.panel_view_provider.websocket_server_instance.initialize_chat(
        {
          text,
          web_configuration_name: resolved_web_configuration_name,
          raw_instructions: current_instructions,
          prompt_type: params.panel_view_provider.web_prompt_type,
          invocation_count: params.invocation_count
        }
      )
  }

  if (sent) {
    params.panel_view_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Continue in the connected browser',
      type: 'success'
    })
  }

  if (!params.web_configuration_name) {
    params.panel_view_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
  }
}

const show_web_configuration_quick_pick = async (params: {
  web_configurations: ConfigWebConfigurationFormat[]
  extension_context: vscode.ExtensionContext
  prompt_type: WebPromptType
  panel_view_provider: PanelViewProvider
  get_is_web_configuration_disabled: (
    web_configuration: ConfigWebConfigurationFormat
  ) => boolean
  is_in_code_at_cursor_mode: boolean
  current_instructions: string
}): Promise<{ web_configuration_name: string | undefined } | null> => {
  const {
    web_configurations,
    extension_context,
    prompt_type,
    panel_view_provider
  } = params

  const valid_web_configurations = web_configurations.filter((c) => c.chatbot)

  if (valid_web_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage('No configurations found.')
    return null
  }

  const recents_key = get_last_used_web_configuration_key(prompt_type)
  const last_selected_name =
    extension_context.workspaceState.get<string>(recents_key) ??
    extension_context.globalState.get<string>(recents_key)

  const result = await show_configuration_quick_pick({
    items: valid_web_configurations,
    map_item: (web_configuration) => {
      const is_unnamed =
        !web_configuration.name ||
        /^\(\d+\)$/.test(web_configuration.name.trim())
      const chatbot_models =
        CHATBOTS[web_configuration.chatbot as keyof typeof CHATBOTS]?.models
      const model = web_configuration.model
        ? chatbot_models?.[web_configuration.model]?.label ||
          web_configuration.model
        : ''

      const details: string[] = []
      if (!is_unnamed && web_configuration.chatbot) {
        details.push(web_configuration.chatbot)
      }
      if (model) {
        details.push(model)
      }
      if (web_configuration.reasoningEffort) {
        details.push(web_configuration.reasoningEffort)
      }

      return {
        label: `${
          is_unnamed
            ? web_configuration.chatbot!
            : web_configuration.name!.replace(/\s*\(\d+\)$/, '')
        }`,
        description: details.join(' · '),
        id: web_configuration.name || '',
        is_pinned: web_configuration.isPinned
      }
    },
    last_selected_id: last_selected_name
  })

  if (!result || result === 'back') {
    panel_view_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
    return null
  }

  const web_configuration = result.item

  if (params.get_is_web_configuration_disabled(web_configuration)) {
    return null
  }

  if (web_configuration.name) {
    handle_update_last_used_web_configuration_or_group({
      panel_view_provider,
      web_configuration_name: web_configuration.name
    })
  }

  return { web_configuration_name: web_configuration.name }
}

const resolve_web_configuration = async (params: {
  panel_view_provider: PanelViewProvider
  web_configuration_name?: string
  show_quick_pick?: boolean
  extension_context: vscode.ExtensionContext
}): Promise<{ web_configuration_name: string | undefined }> => {
  const recents_key = get_last_used_web_configuration_key(
    params.panel_view_provider.web_prompt_type
  )
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const all_web_configurations = config.get<ConfigWebConfigurationFormat[]>(
    'webConfigurations',
    []
  )
  const is_in_code_at_cursor_mode =
    params.panel_view_provider.web_prompt_type == 'code-at-cursor'

  let current_instructions = ''
  if (params.panel_view_provider.web_prompt_type == 'code-at-cursor') {
    current_instructions =
      params.panel_view_provider.code_at_cursor_instructions.instructions[
        params.panel_view_provider.code_at_cursor_instructions.active_index
      ] || ''
  } else if (params.panel_view_provider.web_prompt_type == 'ask-about-files') {
    current_instructions =
      params.panel_view_provider.ask_about_context_instructions.instructions[
        params.panel_view_provider.ask_about_context_instructions.active_index
      ] || ''
  } else if (params.panel_view_provider.web_prompt_type == 'edit-files') {
    current_instructions =
      params.panel_view_provider.edit_files_instructions.instructions[
        params.panel_view_provider.edit_files_instructions.active_index
      ] || ''
  } else if (params.panel_view_provider.web_prompt_type == 'without-files') {
    current_instructions =
      params.panel_view_provider.no_context_instructions.instructions[
        params.panel_view_provider.no_context_instructions.active_index
      ] || ''
  } else if (
    params.panel_view_provider.web_prompt_type == 'find-relevant-files'
  ) {
    current_instructions =
      params.panel_view_provider.find_relevant_files_instructions.instructions[
        params.panel_view_provider.find_relevant_files_instructions.active_index
      ] || ''
  }

  const get_is_web_configuration_disabled = (
    web_configuration: ConfigWebConfigurationFormat
  ) =>
    (web_configuration.chatbot &&
      (!params.panel_view_provider.websocket_server_instance.is_connected_with_browser() ||
        (is_in_code_at_cursor_mode &&
          (!params.panel_view_provider.currently_open_file_path ||
            !!params.panel_view_provider.current_selection)))) ||
    false

  if (params.web_configuration_name !== undefined) {
    const web_configuration = all_web_configurations.find(
      (p) => p.name == params.web_configuration_name
    )
    if (web_configuration) {
      if (get_is_web_configuration_disabled(web_configuration)) {
        return { web_configuration_name: undefined }
      }
      return { web_configuration_name: params.web_configuration_name }
    }
  }

  if (!params.show_quick_pick && params.web_configuration_name === undefined) {
    // Try to use last selection if "Send" button is clicked without specific preset
    const last_selected_name =
      params.extension_context.workspaceState.get<string>(recents_key) ??
      params.extension_context.globalState.get<string>(recents_key)

    if (last_selected_name) {
      const item = all_web_configurations.find(
        (p) => p.name === last_selected_name
      )
      if (item) {
        if (item.chatbot) {
          if (get_is_web_configuration_disabled(item)) {
            return { web_configuration_name: undefined }
          } else {
            return { web_configuration_name: last_selected_name }
          }
        }
      }
    }
  }

  const resolution = await show_web_configuration_quick_pick({
    web_configurations: all_web_configurations,
    extension_context: params.extension_context,
    prompt_type: params.panel_view_provider.web_prompt_type,
    panel_view_provider: params.panel_view_provider,
    get_is_web_configuration_disabled,
    is_in_code_at_cursor_mode,
    current_instructions
  })

  return resolution ?? { web_configuration_name: undefined }
}
