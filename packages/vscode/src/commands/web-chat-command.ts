import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketManager } from '../services/websocket-manager'
import { apply_preset_affixes_to_instruction } from '../helpers/apply-preset-affixes'

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
          'Could not connect to the web browser. Please check if it is running and if the Gemini Coder Connector is installed.'
        )
        return
      }

      const config = vscode.workspace.getConfiguration()

      // Get web chat presets
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

      // Main Instruction Input
      let last_chat_prompt =
        context.workspaceState.get<string>('lastChatPrompt') || ''

      const instruction = await vscode.window.showInputBox({
        prompt: 'Type something',
        placeHolder: 'e.g., "Our task is to..."',
        value: last_chat_prompt
      })

      if (!instruction) {
        return // User cancelled
      }

      await context.workspaceState.update('lastChatPrompt', instruction)

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
        vscode.window.showErrorMessage(
          'Error collecting files: ' + error.message
        )
        return
      }

      // Apply prefixes and suffixes to the instruction
      const modified_instruction = apply_preset_affixes_to_instruction(
        instruction,
        [selected_preset.label]
      )

      const final_text = `${
        context_text ? `<files>\n${context_text}</files>\n` : ''
      }${modified_instruction}`

      // Add to chat history
      const current_history = context.workspaceState.get<string[]>(
        'chat-history',
        []
      )
      const updated_history = [instruction, ...current_history].slice(0, 100)
      await context.workspaceState.update('chat-history', updated_history)

      // Initialize chat with selected preset name
      websocket_server_instance.initialize_chats(final_text, [
        selected_preset.label
      ])
    }
  )
}

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
        'Could not connect to the web browser. Please check if it is running and if the Gemini Coder Connector is installed.'
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

    // Main Instruction Input
    let last_chat_prompt =
      context.workspaceState.get<string>('lastChatPrompt') || ''

    const instruction = await vscode.window.showInputBox({
      prompt: 'Type something',
      placeHolder: 'e.g., "Our task is to..."',
      value: last_chat_prompt
    })

    if (!instruction) {
      return // User cancelled
    }

    await context.workspaceState.update('lastChatPrompt', instruction)

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

    // Apply prefixes and suffixes to the instruction
    const modified_instruction = apply_preset_affixes_to_instruction(
      instruction,
      selected_names
    )

    const final_text = `${
      context_text ? `<files>\n${context_text}</files>\n` : ''
    }${modified_instruction}`

    // Add to chat history
    const current_history = context.workspaceState.get<string[]>(
      'chat-history',
      []
    )
    const updated_history = [instruction, ...current_history].slice(0, 100)
    await context.workspaceState.update('chat-history', updated_history)

    // Initialize chats with selected preset names
    websocket_server_instance.initialize_chats(final_text, selected_names)
  })
}
