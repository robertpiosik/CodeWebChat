import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketManager } from '../services/websocket-manager'

async function handle_code_completion_in_chat_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager,
  preset_names: string[]
) {
  const active_editor = vscode.window.activeTextEditor
  if (!active_editor) {
    vscode.window.showErrorMessage(
      'No active text editor found. Please open a file to use this command.'
    )
    return
  }

  // Check connection status
  if (!websocket_server_instance.is_connected_with_browser()) {
    vscode.window.showInformationMessage(
      'Could not connect to the web browser. Please check if it is running and if the connector extension is installed.'
    )
    return
  }

  // Get optional suggestions from user
  const last_fim_prompt =
    context.workspaceState.get<string>('lastFimPrompt') || ''
  const suggestions = await vscode.window.showInputBox({
    placeHolder: 'Enter optional suggestions',
    prompt: 'e.g., "Avoid writing comments"',
    value: last_fim_prompt
  })

  // Check if user cancelled the input box
  if (suggestions === undefined) {
    // User pressed Escape to cancel
    return
  }

  // Store the suggestions even if empty to remember user preference
  await context.workspaceState.update('lastFimPrompt', suggestions || '')

  // Files Collection using FilesCollector
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

    // Get relative path for the file
    const workspace_folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    const relative_path = active_path.replace(workspace_folder + '/', '')

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const chat_code_completion_instructions = config.get<string>(
      'chatCodeCompletionsInstructions'
    )

    const instructions = `${chat_code_completion_instructions}${
      suggestions ? ` Follow suggestions: ${suggestions}` : ''
    }`

    const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

    // Add to FIM chat history if there are suggestions
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

    // Initialize chats with selected preset names in FIM mode
    websocket_server_instance.initialize_chats(chats)
  } catch (error: any) {
    console.error('Error in FIM in Chat:', error)
    vscode.window.showErrorMessage('Error in FIM in Chat: ' + error.message)
  }
}

// Helper function to filter presets without affixes
function filter_presets_with_affixes(presets: any[]) {
  return presets.filter((preset) => {
    // Exclude presets that have non-empty promptPrefix or promptSuffix
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
      const all_presets = config.get<any[]>('presets', [])

      // Filter out presets with affixes
      const presets = filter_presets_with_affixes(all_presets)

      if (presets.length == 0) {
        vscode.window.showWarningMessage(
          'No available presets without prefixes or suffixes. Please create a preset without affixes for FIM.'
        )
        return
      }

      // Create quickpick items for presets
      const preset_quick_pick_items = presets.map((preset) => ({
        label: preset.name,
        description: `${preset.chatbot}${
          preset.model ? ` - ${preset.model}` : ''
        }`
      }))

      // Show quickpick without multi-select
      const selected_preset = await vscode.window.showQuickPick(
        preset_quick_pick_items,
        {
          placeHolder: 'Choose preset'
        }
      )

      if (!selected_preset) {
        return // User cancelled
      }

      // Use the shared logic with the selected preset
      await handle_code_completion_in_chat_command(
        context,
        file_tree_provider,
        open_editors_provider,
        websocket_server_instance,
        [selected_preset.label]
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
      const all_presets = config.get<any[]>('presets', [])

      // Filter out presets with affixes
      const presets = filter_presets_with_affixes(all_presets)

      if (presets.length == 0) {
        vscode.window.showWarningMessage(
          'No available presets without prefixes or suffixes. Please create a preset without affixes for FIM.'
        )
        return
      }

      // Get previously selected presets from globalState
      let selected_names = context.globalState.get<string[]>(
        'selectedPresets',
        []
      )

      // Filter out any previously selected presets that now have affixes or no longer exist
      const valid_selected_names = selected_names.filter((name) =>
        presets.some((preset) => preset.name == name)
      )

      // If no valid presets were previously selected, show the selection dialog
      if (!valid_selected_names.length) {
        // Create quickpick items for presets
        const preset_quick_pick_items = presets.map((preset) => ({
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
            placeHolder: 'Select one or more chat presets for FIM',
            canPickMany: true
          }
        )

        if (!selected_presets || selected_presets.length == 0) {
          return // User cancelled or didn't select any presets
        }

        // Save selected preset names to globalState
        selected_names = selected_presets.map((preset) => preset.label)
        await context.globalState.update('selectedPresets', selected_names)
      } else {
        // Use the filtered valid selected names
        selected_names = valid_selected_names

        // Update the stored selection with only valid presets
        if (valid_selected_names.length !== selected_names.length) {
          await context.globalState.update(
            'selectedPresets',
            valid_selected_names
          )
        }
      }

      // Use the shared logic with the selected presets
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
