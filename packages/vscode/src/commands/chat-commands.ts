import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketManager } from '../services/websocket-manager'
import { apply_preset_affixes_to_instruction } from '../helpers/apply-preset-affixes'
import { EditFormat } from '@shared/types/edit-format'

async function handle_chat_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager,
  preset_names: string[]
) {
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
    return
  }

  const editor = vscode.window.activeTextEditor
  const document = editor?.document
  const current_file_path = document
    ? vscode.workspace.asRelativePath(document.uri)
    : ''

  if (editor && !editor.selection.isEmpty) {
    const selected_text = editor.document.getText(editor.selection)
    instructions = `\`${current_file_path}\`\n\`\`\`\n${selected_text}\n\`\`\`\n${instructions}`
  }

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

  const edit_format = context.workspaceState.get<EditFormat>(
    'editFormat',
    'truncated'
  )
  const edit_format_instructions = vscode.workspace
    .getConfiguration('codeWebChat')
    .get<string>(
      `editFormatInstructions${
        edit_format.charAt(0).toUpperCase() + edit_format.slice(1)
      }`
    )

  const chats = preset_names.map((preset_name) => {
    let processed_instructions = apply_preset_affixes_to_instruction(
      instructions,
      preset_name
    )

    if (edit_format_instructions && context_text) {
      processed_instructions += `\n${edit_format_instructions}`
    }

    const chat_text = context_text
      ? `${processed_instructions}\n<files>\n${context_text}</files>\n${processed_instructions}`
      : processed_instructions

    return {
      text: chat_text,
      preset_name: preset_name
    }
  })

  websocket_server_instance.initialize_chats(chats)
}

export function chat_using_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand('codeWebChat.chatUsing', async () => {
    if (!websocket_server_instance.is_connected_with_browser()) {
      vscode.window.showInformationMessage(
        'Could not connect to the web browser. Please check if it is running and if the connector extension is installed.'
      )
      return
    }

    const last_chat_prompt =
      context.workspaceState.get<string>('last-chat-prompt') || ''

    const input_box = vscode.window.createInputBox()
    input_box.placeholder = 'Ask anything'
    input_box.value = last_chat_prompt

    input_box.onDidChangeValue(async (value) => {
      await context.workspaceState.update('last-chat-prompt', value)
    })

    const instructions = await new Promise<string | undefined>((resolve) => {
      input_box.onDidAccept(() => {
        resolve(input_box.value)
        input_box.hide()
      })
      input_box.onDidHide(() => resolve(undefined))
      input_box.show()
    })

    if (!instructions) {
      return
    }

    const editor = vscode.window.activeTextEditor
    const document = editor?.document
    const current_file_path = document
      ? vscode.workspace.asRelativePath(document.uri)
      : ''

    let processed_instructions = instructions
    if (editor && !editor.selection.isEmpty) {
      const selected_text = editor.document.getText(editor.selection)
      processed_instructions = `\`${current_file_path}\`\n\`\`\`\n${selected_text}\n\`\`\`\n${instructions}`
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_chat_presets = config.get<any[]>('presets', [])

    const preset_quick_pick_items = web_chat_presets.map((preset) => ({
      label: preset.name,
      description: `${preset.chatbot}${
        preset.model ? ` - ${preset.model}` : ''
      }`
    }))

    const selected_preset = await vscode.window.showQuickPick(
      preset_quick_pick_items,
      {
        placeHolder: 'Select a chat preset'
      }
    )

    if (!selected_preset) {
      return
    }

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

    processed_instructions = apply_preset_affixes_to_instruction(
      processed_instructions,
      selected_preset.label
    )

    const edit_format = config.get<EditFormat>('editFormat')!
    const edit_format_instructions = config.get<string>(
      `editFormatInstructions${
        edit_format.charAt(0).toUpperCase() + edit_format.slice(1)
      }`
    )

    const text = `${
      context_text
        ? `${processed_instructions}\n<files>\n${context_text}</files>\n`
        : ''
    }${
      edit_format_instructions
        ? `${processed_instructions}\n${edit_format_instructions}`
        : processed_instructions
    }`

    // Update initialize_chats call to match the new signature
    websocket_server_instance.initialize_chats([
      { text: text, preset_name: selected_preset.label }
    ])
  })
}

export function chat_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand('codeWebChat.chat', async () => {
    if (!websocket_server_instance.is_connected_with_browser()) {
      vscode.window.showInformationMessage(
        'Could not connect to the web browser. Please check if it is running and if the connector extension is installed.'
      )
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_chat_presets = config.get<any[]>('presets', [])

    let selected_names = context.globalState.get<string[]>(
      'selectedPresets',
      []
    )

    if (!selected_names.length) {
      const preset_quick_pick_items = web_chat_presets.map((preset) => ({
        label: preset.name,
        description: `${preset.chatbot}${
          preset.model ? ` - ${preset.model}` : ''
        }`,
        picked: false
      }))

      const selected_presets = await vscode.window.showQuickPick(
        preset_quick_pick_items,
        {
          placeHolder: 'Select one or more chat presets',
          canPickMany: true
        }
      )

      if (!selected_presets || selected_presets.length == 0) {
        return
      }

      selected_names = selected_presets.map((preset) => preset.label)
      await context.globalState.update('selectedPresets', selected_names)
    }

    await handle_chat_command(
      context,
      file_tree_provider,
      open_editors_provider,
      websocket_server_instance,
      selected_names
    )
  })
}
