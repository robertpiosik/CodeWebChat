import * as vscode from 'vscode'
import { FilesCollector } from '../utils/files-collector'
import { WebSocketManager } from '../services/websocket-manager'
import { ConfigPresetFormat } from '@/view/backend/helpers/preset-format-converters'
import { chat_code_completion_instructions } from '../constants/instructions'
import { CHATBOTS } from '@shared/constants/chatbots'

async function handle_code_completion_in_chat_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager,
  preset_names: string[]
) {
  const active_editor = vscode.window.activeTextEditor
  if (!active_editor) {
    vscode.window.showErrorMessage('This command requires active text editor.')
    return
  }

  if (!websocket_server_instance.is_connected_with_browser()) {
    vscode.window.showInformationMessage(
      'Could not connect to the web browser. Please check if it is running and if the connector extension is installed.'
    )
    return
  }

  const last_value =
    context.workspaceState.get<string>('last-completion-instructions') || ''
  const suggestions = await vscode.window.showInputBox({
    placeHolder: 'Completion instructions',
    prompt: 'E.g. "Include explanatory comments".',
    value: last_value
  })

  if (suggestions === undefined) {
    return
  }

  await context.workspaceState.update(
    'last-completion-instructions',
    suggestions || ''
  )

  const files_collector = new FilesCollector(
    file_tree_provider,
    open_editors_provider
  )

  try {
    const document = active_editor.document
    const position = active_editor.selection.active
    const active_path = document.uri.fsPath

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )

    const context_text = await files_collector.collect_files({
      exclude_path: active_path
    })

    const workspace_folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    const relative_path = active_path.replace(workspace_folder + '/', '')

    const instructions = `${chat_code_completion_instructions(
      relative_path,
      position.line,
      position.character
    )}${suggestions ? ` Follow instructions: ${suggestions}` : ''}`

    const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

    if (suggestions) {
      const current_history = context.workspaceState.get<string[]>(
        'code-completions-history',
        []
      )
      const updated_history = [suggestions, ...current_history].slice(0, 100)
      await context.workspaceState.update(
        'code-completions-history',
        updated_history
      )
    }

    const chats = preset_names.map((preset_name) => {
      return {
        text,
        preset_name
      }
    })

    websocket_server_instance.initialize_chats(
      chats,
      'chatPresetsForCodeAtCursor'
    )
  } catch (error: any) {
    console.error('Error in FIM in Chat:', error)
    vscode.window.showErrorMessage('Error in FIM in Chat: ' + error.message)
  }
}

// Helper function to filter presets without affixes
function filter_presets_with_affixes(presets: ConfigPresetFormat[]) {
  return presets.filter((preset) => {
    return (
      (!preset.promptPrefix || preset.promptPrefix.trim() == '') &&
      (!preset.promptSuffix || preset.promptSuffix.trim() == '')
    )
  })
}

// For single preset selection
export function code_completion_in_chat_with_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand(
    'codeWebChat.codeCompletionInChatUsing',
    async () => {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const all_presets = config.get<ConfigPresetFormat[]>(
        'chatPresetsForCodeAtCursor',
        []
      )
      const presets = filter_presets_with_affixes(all_presets)

      if (presets.length == 0) {
        vscode.window.showWarningMessage(
          'No available presets without prefixes or suffixes. Please create a preset without affixes for FIM.'
        )
        return
      }

      const preset_quick_pick_items = presets
        .filter((preset) => CHATBOTS[preset.chatbot])
        .map((preset) => {
          const is_unnamed =
            !preset.name || /^\(\d+\)$/.test(preset.name.trim())
          const chatbot_info = CHATBOTS[preset.chatbot] as any
          const model_display_name = preset.model
            ? (chatbot_info &&
                chatbot_info.models &&
                chatbot_info.models[preset.model]) ||
              preset.model
            : ''

          return {
            label: is_unnamed ? preset.chatbot : preset.name,
            description: is_unnamed
              ? model_display_name
              : `${preset.chatbot}${
                  model_display_name ? ` · ${model_display_name}` : ''
                }`,
            name: preset.name
          }
        })

      const selected_preset = await vscode.window.showQuickPick(
        preset_quick_pick_items,
        {
          placeHolder: 'Choose preset'
        }
      )

      if (!selected_preset) {
        return
      }

      await handle_code_completion_in_chat_command(
        context,
        file_tree_provider,
        open_editors_provider,
        websocket_server_instance,
        [selected_preset.name]
      )
    }
  )
}

// For using previously selected presets
export function code_completion_in_chat_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand(
    'codeWebChat.codeCompletionInChat',
    async () => {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const all_presets = config.get<ConfigPresetFormat[]>(
        'chatPresetsForCodeAtCursor',
        []
      )
      const presets = filter_presets_with_affixes(all_presets)

      if (presets.length == 0) {
        vscode.window.showWarningMessage(
          'No available presets without prefixes or suffixes. Please create a preset without affixes for FIM.'
        )
        return
      }

      let selected_names = context.globalState.get<string[]>(
        'selectedPresets.code-completions',
        []
      )

      const valid_selected_names = selected_names.filter((name) =>
        presets.some((preset) => preset.name == name)
      )

      if (!valid_selected_names.length) {
        const preset_quick_pick_items = presets.map((preset) => {
          const is_unnamed =
            !preset.name || /^\(\d+\)$/.test(preset.name.trim())
          const chatbot_info = CHATBOTS[preset.chatbot] as any
          const model_display_name = preset.model
            ? (chatbot_info &&
                chatbot_info.models &&
                chatbot_info.models[preset.model]) ||
              preset.model
            : ''
          return {
            label: is_unnamed ? preset.chatbot : preset.name,
            description: is_unnamed
              ? model_display_name
              : `${preset.chatbot}${
                  model_display_name ? ` · ${model_display_name}` : ''
                }`,
            picked: false,
            name: preset.name
          }
        })

        const selected_presets = await vscode.window.showQuickPick(
          preset_quick_pick_items,
          {
            placeHolder: 'Select one or more chat presets for FIM',
            canPickMany: true
          }
        )

        if (!selected_presets || selected_presets.length == 0) {
          return
        }

        selected_names = selected_presets.map((preset) => preset.name)
        await context.globalState.update(
          'selectedPresets.code-completions',
          selected_names
        )
      } else {
        selected_names = valid_selected_names

        if (valid_selected_names.length !== selected_names.length) {
          await context.globalState.update(
            'selectedPresets.code-completions',
            valid_selected_names
          )
        }
      }

      await handle_code_completion_in_chat_command(
        context,
        file_tree_provider,
        open_editors_provider,
        websocket_server_instance,
        selected_names
      )
    }
  )
}
