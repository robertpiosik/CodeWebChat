import * as vscode from 'vscode'
import { FilesCollector } from '../utils/files-collector'
import { WebSocketManager } from '../services/websocket-manager'
import { replace_selection_placeholder } from '../utils/replace-selection-placeholder'
import { apply_preset_affixes_to_instruction } from '../utils/apply-preset-affixes'
import { replace_saved_context_placeholder } from '../utils/replace-saved-context-placeholder'
import { EditFormat } from '@shared/types/edit-format'
import { replace_changes_placeholder } from '../utils/replace-changes-placeholder'
import { at_sign_quick_pick } from '../utils/at-sign-quick-pick'
import { CHATBOTS } from '@shared/constants/chatbots'
import { ConfigPresetFormat } from '@/view/backend/helpers/preset-format-converters'

async function handle_at_sign_in_chat_input(
  input_box: vscode.InputBox,
  current_value: string,
  cursor_position: number,
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  input_box.hide()

  const replacement = await at_sign_quick_pick(context)

  if (!replacement) {
    input_box.show()
    input_box.valueSelection = [cursor_position, cursor_position]
    return current_value
  }

  const is_after_at_sign = current_value.slice(0, cursor_position).endsWith('@')
  const text_to_insert = is_after_at_sign ? replacement : `@${replacement}`

  const new_value =
    current_value.slice(0, cursor_position) +
    text_to_insert +
    current_value.slice(cursor_position)

  await context.workspaceState.update('last-chat-prompt', new_value)

  return new_value
}

async function get_chat_instructions(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  const last_chat_prompt =
    context.workspaceState.get<string>('last-chat-prompt') || ''

  const input_box = vscode.window.createInputBox()
  input_box.placeholder = 'Type something'
  input_box.value = last_chat_prompt

  let current_cursor_position = last_chat_prompt.length
  let previous_value = last_chat_prompt
  let is_handling_at_sign = false

  input_box.onDidChangeValue(async (value) => {
    if (is_handling_at_sign) {
      return
    }

    await context.workspaceState.update('last-chat-prompt', value)

    const typed_at_sign =
      value.endsWith('@') && value.length + 1 != previous_value.length

    if (typed_at_sign) {
      is_handling_at_sign = true
      current_cursor_position = value.length

      const new_value = await handle_at_sign_in_chat_input(
        input_box,
        value,
        current_cursor_position,
        context
      )

      if (new_value !== undefined && new_value !== value) {
        input_box.value = new_value
        current_cursor_position = new_value.length
        setTimeout(() => {
          input_box.valueSelection = [
            current_cursor_position,
            current_cursor_position
          ]
        }, 0)
      }

      input_box.show()
      is_handling_at_sign = false
    }

    previous_value = value
  })

  return new Promise<string | undefined>((resolve) => {
    input_box.onDidAccept(() => {
      resolve(input_box.value)
      input_box.hide()
    })
    input_box.onDidHide(() => {
      if (!is_handling_at_sign) {
        resolve(undefined)
      }
    })
    input_box.show()
  })
}

async function process_chat_instructions(
  instructions: string,
  preset_names: string[],
  context: vscode.ExtensionContext,
  workspace_provider: any,
  open_editors_provider: any,
  presets_config_key: string
) {
  const files_collector = new FilesCollector(
    workspace_provider,
    open_editors_provider
  )
  let context_text = ''

  try {
    context_text = await files_collector.collect_files()
  } catch (error: any) {
    console.error('Error collecting files:', error)
    vscode.window.showErrorMessage('Error collecting files: ' + error.message)
    return null
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

  return Promise.all(
    preset_names.map(async (preset_name) => {
      let base_instructions = apply_preset_affixes_to_instruction(
        instructions,
        preset_name,
        presets_config_key
      )

      if (base_instructions.includes('@Selection')) {
        base_instructions = replace_selection_placeholder(base_instructions)
      }

      let pre_context_instructions = base_instructions
      let post_context_instructions = base_instructions

      if (pre_context_instructions.includes('@Changes:')) {
        pre_context_instructions = await replace_changes_placeholder(
          pre_context_instructions
        )
      }

      if (base_instructions.includes('@SavedContext:')) {
        pre_context_instructions = await replace_saved_context_placeholder(
          pre_context_instructions,
          context,
          workspace_provider
        )
        post_context_instructions = await replace_saved_context_placeholder(
          post_context_instructions,
          context,
          workspace_provider,
          true
        )
      }

      if (edit_format_instructions && context_text) {
        pre_context_instructions += `\n${edit_format_instructions}`
        post_context_instructions += `\n${edit_format_instructions}`
      }

      const chat_text = context_text
        ? `${pre_context_instructions}\n<files>\n${context_text}</files>\n${post_context_instructions}`
        : pre_context_instructions

      return {
        text: chat_text,
        preset_name: preset_name
      }
    })
  )
}

export async function handle_chat_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  websocket_server_instance: WebSocketManager,
  preset_names: string[],
  presets_config_key: string
) {
  const instructions = await get_chat_instructions(context)
  if (!instructions) return

  const chats = await process_chat_instructions(
    instructions,
    preset_names,
    context,
    file_tree_provider,
    open_editors_provider,
    presets_config_key
  )
  if (!chats) return

  websocket_server_instance.initialize_chats(chats, presets_config_key)
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

    const instructions = await get_chat_instructions(context)
    if (!instructions) return

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const presets_config_key = 'chatPresetsForEditContext'
    const web_chat_presets = config.get<ConfigPresetFormat[]>(
      presets_config_key,
      []
    )

    const preset_quick_pick_items = web_chat_presets
      .filter((preset) => CHATBOTS[preset.chatbot])
      .map((preset) => ({
        label: preset.name,
        description: `${preset.chatbot}${
          preset.model ? ` - ${preset.model}` : ''
        }`
      }))

    const selected_preset = await vscode.window.showQuickPick(
      preset_quick_pick_items,
      {
        placeHolder: 'Select preset'
      }
    )

    if (!selected_preset) return

    const chats = await process_chat_instructions(
      instructions,
      [selected_preset.label],
      context,
      file_tree_provider,
      open_editors_provider,
      presets_config_key
    )
    if (!chats) return

    websocket_server_instance.initialize_chats(chats, presets_config_key)
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
    const chat_presets = config.get<ConfigPresetFormat[]>(
      'chatPresetsForEditContext',
      []
    )

    let selected_names = context.globalState.get<string[]>(
      'selectedPresets.edit',
      []
    )

    if (!selected_names.length) {
      const preset_quick_pick_items = chat_presets
        .filter((preset) => CHATBOTS[preset.chatbot])
        .map((preset) => ({
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
      await context.globalState.update('selectedPresets.edit', selected_names)
    }

    await handle_chat_command(
      context,
      file_tree_provider,
      open_editors_provider,
      websocket_server_instance,
      selected_names,
      'chatPresetsForEditContext'
    )
  })
}
