import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketManager } from '../services/websocket-manager'
import { apply_preset_affixes_to_instruction } from '../helpers/apply-preset-affixes'
import { replace_selection_placeholder } from '../utils/replace-selection-placeholder'
import { EditFormat } from '@shared/types/edit-format'

// Shared logic extracted to a helper function
async function handle_chat_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager,
  preset_names: string[]
) {
  // Get instruction from user
  const last_chat_prompt =
    context.workspaceState.get<string>('last-chat-prompt') || ''

  const input_box = vscode.window.createInputBox()
  input_box.placeholder = 'Ask anything'
  input_box.value = last_chat_prompt

  input_box.onDidChangeValue(async (value) => {
    await context.workspaceState.update('last-chat-prompt', value)
  })

  let instructions = await new Promise<string | undefined>((resolve) => {
    input_box.onDidAccept(() => {
      resolve(input_box.value)
      input_box.hide()
    })
    input_box.onDidHide(() => resolve(undefined))
    input_box.show()
  })

  if (!instructions) {
    return // User cancelled
  }

  const current_history = context.workspaceState.get<string[]>('history', [])
  const updated_history = [instructions, ...current_history].slice(0, 100)
  await context.workspaceState.update('history', updated_history)

  // Files Collection using FilesCollector
  const files_collector = new FilesCollector(
    file_tree_provider,
    open_editors_provider
  )
  let context_text = ''

  try {
    const active_editor = vscode.window.activeTextEditor
    const active_path = active_editor?.document.uri.fsPath
    context_text = await files_collector.collect_files({ active_path })
  } catch (error: any) {
    console.error('Error collecting files:', error)
    vscode.window.showErrorMessage('Error collecting files: ' + error.message)
    return
  }

  instructions = replace_selection_placeholder(instructions)
  instructions = apply_preset_affixes_to_instruction(instructions, preset_names)

  const config = vscode.workspace.getConfiguration()
  const edit_format = config.get<EditFormat>('geminiCoder.editFormat')!
  const edit_format_instructions = config.get<string>(
    `geminiCoder.editFormatInstructions${
      edit_format.charAt(0).toUpperCase() + edit_format.slice(1)
    }`
  )

  if (edit_format_instructions) {
    instructions += `\n${edit_format_instructions}`
  }

  const text = `${
    context_text ? `${instructions}\n<files>\n${context_text}</files>\n` : ''
  }${instructions}`

  // Initialize chats with selected preset names
  websocket_server_instance.initialize_chats(text, preset_names)
}

// For single preset selection
export function web_chat_with_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand(
    'geminiCoder.webChatWith',
    async () => {
      // Check connection status immediately
      if (!websocket_server_instance.is_connected_with_browser()) {
        vscode.window.showInformationMessage(
          'Could not connect to the web browser. Please check if it is running and if the Gemini Coder Connector is installed. You might also need to open Gemini Coder panel for the first time to fully initialize the extension.'
        )
        return
      }

      const config = vscode.workspace.getConfiguration()
      const web_chat_presets = config.get<any[]>('geminiCoder.presets', [])

      // Create quickpick items for presets
      const preset_quick_pick_items = web_chat_presets.map((preset) => ({
        label: preset.name,
        description: `${preset.chatbot}${
          preset.model ? ` - ${preset.model}` : ''
        }`
      }))

      // Show quickpick without multi-select
      const selected_preset = await vscode.window.showQuickPick(
        preset_quick_pick_items,
        {
          placeHolder: 'Select a chat preset'
        }
      )

      if (!selected_preset) {
        return // User cancelled
      }

      // Use the shared logic with the selected preset
      await handle_chat_command(
        context,
        file_tree_provider,
        open_editors_provider,
        websocket_server_instance,
        [selected_preset.label]
      )
    }
  )
}

// For multiple preset selection
export function web_chat_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand('geminiCoder.webChat', async () => {
    // Check connection status immediately
    if (!websocket_server_instance.is_connected_with_browser()) {
      vscode.window.showInformationMessage(
        'Could not connect to the web browser. Please check if it is running and if the Gemini Coder Connector is installed. You might also need to open Gemini Coder panel for the first time to fully initialize the extension.'
      )
      return
    }

    const config = vscode.workspace.getConfiguration()
    const web_chat_presets = config.get<any[]>('geminiCoder.presets', [])

    // Get previously selected presets from globalState
    let selected_names = context.globalState.get<string[]>(
      'selectedPresets',
      []
    )

    // If no presets were previously selected, show the selection dialog
    if (!selected_names.length) {
      // Create quickpick items for presets
      const preset_quick_pick_items = web_chat_presets.map((preset) => ({
        label: preset.name,
        description: `${preset.chatbot}${
          preset.model ? ` - ${preset.model}` : ''
        }`,
        picked: false
      }))

      // Show quickpick with multi-select enabled
      const selected_presets = await vscode.window.showQuickPick(
        preset_quick_pick_items,
        {
          placeHolder: 'Select one or more chat presets',
          canPickMany: true
        }
      )

      if (!selected_presets || selected_presets.length == 0) {
        return // User cancelled or didn't select any presets
      }

      // Save selected preset names to globalState
      selected_names = selected_presets.map((preset) => preset.label)
      await context.globalState.update('selectedPresets', selected_names)
    }

    // Use the shared logic with the selected presets
    await handle_chat_command(
      context,
      file_tree_provider,
      open_editors_provider,
      websocket_server_instance,
      selected_names
    )
  })
}
