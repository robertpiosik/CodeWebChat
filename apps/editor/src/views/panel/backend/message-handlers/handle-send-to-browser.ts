import { PanelProvider } from '@/views/panel/backend/panel-provider'
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

export const handle_send_to_browser = async (params: {
  panel_provider: PanelProvider
  web_configuration_name?: string
  show_quick_pick?: boolean
  invocation_count: number
}): Promise<void> => {
  if (
    params.panel_provider.mode == MODE.WEB &&
    !params.panel_provider.websocket_server_instance.is_connected_with_browser()
  ) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.BROWSER_EXTENSION_NOT_CONNECTED
    )
    return
  }

  const is_in_code_completions_mode =
    params.panel_provider.web_prompt_type == 'code-at-cursor'
  const current_instructions = params.panel_provider.current_instruction

  const active_editor = vscode.window.activeTextEditor

  if (is_in_code_completions_mode && !active_editor) {
    vscode.window.showWarningMessage(dictionary.warning_message.NO_EDITOR_OPEN)
    return
  }

  const resolution = await resolve_web_configuration({
    panel_provider: params.panel_provider,
    web_configuration_name: params.web_configuration_name,
    context: params.panel_provider.context,
    show_quick_pick: params.show_quick_pick
  })

  if (!resolution.web_configuration_name) {
    return
  }
  const resolved_web_configuration_name = resolution.web_configuration_name

  if (params.web_configuration_name !== undefined) {
    handle_update_last_used_web_configuration_or_group({
      panel_provider: params.panel_provider,
      web_configuration_name: params.web_configuration_name
    })
  }

  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector({
    workspace_provider: params.panel_provider.workspace_provider,
    open_editors_provider: params.panel_provider.open_editors_provider
  })

  let sent = false

  if (is_in_code_completions_mode) {
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
      context: params.panel_provider.context,
      workspace_provider: params.panel_provider.workspace_provider,
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

    const payload = {
      before: `<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const text = `${payload.before}${
      processed_completion_instructions
        ? `<missing_text>${processed_completion_instructions}</missing_text>`
        : '<missing_text>'
    }${payload.after}\n${skill_definitions}${main_instructions}`

    sent =
      await params.panel_provider.websocket_server_instance.initialize_chat({
        text,
        web_configuration_name: resolved_web_configuration_name,
        raw_instructions: processed_completion_instructions,
        prompt_type: params.panel_provider.web_prompt_type,
        invocation_count: params.invocation_count
      })
  } else {
    const additional_paths: string[] = []

    const shrink_source_code =
      params.panel_provider.context.workspaceState.get<boolean>(
        FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
        false
      )

    const collected = await files_collector.collect_files({
      additional_paths,
      no_context: params.panel_provider.web_prompt_type == 'without-files',
      shrink:
        params.panel_provider.web_prompt_type == 'find-relevant-files' &&
        shrink_source_code
    })
    const context_text = collected.other_files + collected.recent_files

    const { instruction: processed_instructions, skill_definitions } =
      await replace_symbols({
        instruction: current_instructions,
        context: params.panel_provider.context,
        workspace_provider: params.panel_provider.workspace_provider,
        remove_images: true
      })

    let system_instructions_xml = ''
    if (params.panel_provider.web_prompt_type == 'edit-files') {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const instructions_key = {
        whole: 'editFormatInstructionsWhole',
        truncated: 'editFormatInstructionsTruncated',
        'search-replace': 'editFormatInstructionsSearchReplace',
        diff: 'editFormatInstructionsDiff'
      }[params.panel_provider.chat_edit_format]
      const default_instructions = {
        whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
        truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
        'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
        diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
      }[params.panel_provider.chat_edit_format]
      const edit_format_instructions =
        config.get<string>(instructions_key) || default_instructions
      if (edit_format_instructions) {
        system_instructions_xml = `<system>\n${edit_format_instructions}\n</system>`
      }
    } else if (params.panel_provider.web_prompt_type == 'find-relevant-files') {
      system_instructions_xml = `${find_relevant_files_format_for_panel}\n${find_relevant_files_instructions}`
    }

    const text = context_text
      ? `<files>\n${context_text}</files>\n${skill_definitions}${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }${processed_instructions}`
      : `${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }${skill_definitions}${processed_instructions}`

    sent =
      await params.panel_provider.websocket_server_instance.initialize_chat({
        text,
        web_configuration_name: resolved_web_configuration_name,
        raw_instructions: current_instructions,
        prompt_type: params.panel_provider.web_prompt_type,
        edit_format:
          params.panel_provider.web_prompt_type == 'edit-files'
            ? params.panel_provider.chat_edit_format
            : undefined,
        invocation_count: params.invocation_count
      })
  }

  if (sent) {
    params.panel_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Continue in the connected browser',
      type: 'success'
    })
  }

  if (!params.web_configuration_name) {
    params.panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
  }
}

const show_web_configuration_quick_pick = async (params: {
  web_configurations: ConfigWebConfigurationFormat[]
  context: vscode.ExtensionContext
  prompt_type: WebPromptType
  panel_provider: PanelProvider
  get_is_web_configuration_disabled: (
    web_configuration: ConfigWebConfigurationFormat
  ) => boolean
  is_in_code_completions_mode: boolean
  current_instructions: string
}): Promise<{ web_configuration_name: string | undefined } | null> => {
  const { web_configurations, context, prompt_type, panel_provider } = params

  const valid_web_configurations = web_configurations.filter((c) => c.chatbot)

  if (valid_web_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage('No configurations found.')
    return null
  }

  const recents_key = get_last_used_web_configuration_key(prompt_type)
  const last_selected_name =
    context.workspaceState.get<string>(recents_key) ??
    context.globalState.get<string>(recents_key)

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
    panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
    return null
  }

  const web_configuration = result.item

  if (params.get_is_web_configuration_disabled(web_configuration)) {
    return null
  }

  if (web_configuration.name) {
    handle_update_last_used_web_configuration_or_group({
      panel_provider,
      web_configuration_name: web_configuration.name
    })
  }

  return { web_configuration_name: web_configuration.name }
}

const resolve_web_configuration = async (params: {
  panel_provider: PanelProvider
  web_configuration_name?: string
  show_quick_pick?: boolean
  context: vscode.ExtensionContext
}): Promise<{ web_configuration_name: string | undefined }> => {
  const recents_key = get_last_used_web_configuration_key(
    params.panel_provider.web_prompt_type
  )
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const all_web_configurations = config.get<ConfigWebConfigurationFormat[]>(
    'webConfigurations',
    []
  )
  const is_in_code_completions_mode =
    params.panel_provider.web_prompt_type == 'code-at-cursor'

  let current_instructions = ''
  if (params.panel_provider.web_prompt_type == 'code-at-cursor') {
    current_instructions =
      params.panel_provider.code_at_cursor_instructions.instructions[
        params.panel_provider.code_at_cursor_instructions.active_index
      ] || ''
  } else if (params.panel_provider.web_prompt_type == 'ask-about-files') {
    current_instructions =
      params.panel_provider.ask_about_context_instructions.instructions[
        params.panel_provider.ask_about_context_instructions.active_index
      ] || ''
  } else if (params.panel_provider.web_prompt_type == 'edit-files') {
    current_instructions =
      params.panel_provider.edit_context_instructions.instructions[
        params.panel_provider.edit_context_instructions.active_index
      ] || ''
  } else if (params.panel_provider.web_prompt_type == 'without-files') {
    current_instructions =
      params.panel_provider.no_context_instructions.instructions[
        params.panel_provider.no_context_instructions.active_index
      ] || ''
  } else if (params.panel_provider.web_prompt_type == 'find-relevant-files') {
    current_instructions =
      params.panel_provider.find_relevant_files_instructions.instructions[
        params.panel_provider.find_relevant_files_instructions.active_index
      ] || ''
  }

  const get_is_web_configuration_disabled = (
    web_configuration: ConfigWebConfigurationFormat
  ) =>
    (web_configuration.chatbot &&
      (!params.panel_provider.websocket_server_instance.is_connected_with_browser() ||
        (is_in_code_completions_mode &&
          (!params.panel_provider.currently_open_file_path ||
            !!params.panel_provider.current_selection)))) ||
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
      params.context.workspaceState.get<string>(recents_key) ??
      params.context.globalState.get<string>(recents_key)

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
    context: params.context,
    prompt_type: params.panel_provider.web_prompt_type,
    panel_provider: params.panel_provider,
    get_is_web_configuration_disabled,
    is_in_code_completions_mode,
    current_instructions
  })

  return resolution ?? { web_configuration_name: undefined }
}
