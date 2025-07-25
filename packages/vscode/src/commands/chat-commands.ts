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
import { LAST_SELECTED_PRESET_KEY } from '@/constants/state-keys'
import { ConfigPresetFormat } from '@/view/backend/helpers/preset-format-converters'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors-provider'

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
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider,
  presets_config_key: string,
  options: { with_context: boolean; with_edit_format: boolean } = {
    with_context: true,
    with_edit_format: true
  }
) {
  const files_collector = new FilesCollector(
    workspace_provider,
    open_editors_provider
  )
  let context_text = ''

  if (options.with_context) {
    try {
      context_text = await files_collector.collect_files()
    } catch (error: any) {
      console.error('Error collecting files:', error)
      vscode.window.showErrorMessage('Error collecting files: ' + error.message)
      return null
    }
  }

  let edit_format_instructions: string | undefined
  if (options.with_edit_format) {
    const edit_format = context.workspaceState.get<EditFormat>(
      'editFormat',
      'truncated'
    )
    const all_instructions = vscode.workspace
      .getConfiguration('codeWebChat')
      .get<{ [key in EditFormat]: string }>('editFormatInstructions')

    edit_format_instructions = all_instructions?.[edit_format]
  }

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

function create_preset_quick_pick(
  context: vscode.ExtensionContext,
  presets: ConfigPresetFormat[],
  placeholder: string = 'Select preset'
): Promise<{ name: string } | undefined> {
  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { preset: ConfigPresetFormat }
  >()

  const create_items = () => {
    return presets
      .filter((preset) => CHATBOTS[preset.chatbot])
      .map((preset) => {
        const is_unnamed = !preset.name || /^\(\d+\)$/.test(preset.name.trim())
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
          preset
        }
      })
  }

  quick_pick.items = create_items()
  quick_pick.placeholder = placeholder
  quick_pick.matchOnDescription = true

  const last_selected_item = context.globalState.get<string>(
    LAST_SELECTED_PRESET_KEY
  )
  if (last_selected_item) {
    const last_item = quick_pick.items.find(
      (item) => item.preset.name === last_selected_item
    )
    if (last_item) {
      quick_pick.activeItems = [last_item]
    }
  }

  return new Promise<{ name: string } | undefined>((resolve) => {
    quick_pick.onDidAccept(() => {
      const selected = quick_pick.selectedItems[0]
      quick_pick.hide()

      if (selected) {
        context.globalState.update(
          LAST_SELECTED_PRESET_KEY,
          selected.preset.name
        )
        resolve({ name: selected.preset.name })
      } else {
        resolve(undefined)
      }
    })

    quick_pick.onDidHide(() => {
      quick_pick.dispose()
      resolve(undefined)
    })

    quick_pick.show()
  })
}

export function edit_context_in_chat_using_command(
  context: vscode.ExtensionContext,
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand(
    'codeWebChat.editContextInChatUsing',
    async () => {
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

      const selected_preset = await create_preset_quick_pick(
        context,
        web_chat_presets,
        'Select preset'
      )

      if (!selected_preset) return

      const chats = await process_chat_instructions(
        instructions,
        [selected_preset.name],
        context,
        workspace_provider,
        open_editors_provider,
        presets_config_key,
        { with_context: true, with_edit_format: true }
      )
      if (!chats) return

      websocket_server_instance.initialize_chats(chats, presets_config_key)
    }
  )
}

export function edit_context_in_chat_command(
  context: vscode.ExtensionContext,
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand(
    'codeWebChat.editContextInChat',
    async () => {
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
      const chat_presets = config.get<ConfigPresetFormat[]>(
        presets_config_key,
        []
      )

      const default_preset = chat_presets.find((p) => p.isDefault)
      let selected_names: string[] = []

      if (default_preset) {
        selected_names = [default_preset.name]
      } else {
        const selected_preset = await create_preset_quick_pick(
          context,
          chat_presets,
          'Select one chat preset'
        )

        if (!selected_preset) {
          return
        }

        selected_names = [selected_preset.name]
      }

      const chats = await process_chat_instructions(
        instructions,
        selected_names,
        context,
        workspace_provider,
        open_editors_provider,
        presets_config_key,
        { with_context: true, with_edit_format: true }
      )
      if (!chats) return

      websocket_server_instance.initialize_chats(chats, presets_config_key)
    }
  )
}

export function ask_about_context_command(
  context: vscode.ExtensionContext,
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand(
    'codeWebChat.askAboutContext',
    async () => {
      if (!websocket_server_instance.is_connected_with_browser()) {
        vscode.window.showInformationMessage(
          'Could not connect to the web browser. Please check if it is running and if the connector extension is installed.'
        )
        return
      }

      const instructions = await get_chat_instructions(context)
      if (!instructions) return

      const config = vscode.workspace.getConfiguration('codeWebChat')
      const presets_config_key = 'chatPresetsForAskAboutContext'
      const chat_presets = config.get<ConfigPresetFormat[]>(
        'chatPresetsForAskAboutContext',
        []
      )

      const default_preset = chat_presets.find((p) => p.isDefault)
      let selected_names: string[] = []

      if (default_preset) {
        selected_names = [default_preset.name]
      } else {
        const selected_preset = await create_preset_quick_pick(
          context,
          chat_presets,
          'Select one chat preset'
        )

        if (!selected_preset) {
          return
        }

        selected_names = [selected_preset.name]
      }

      const chats = await process_chat_instructions(
        instructions,
        selected_names,
        context,
        workspace_provider,
        open_editors_provider,
        presets_config_key,
        { with_context: true, with_edit_format: false }
      )
      if (!chats) return

      websocket_server_instance.initialize_chats(chats, presets_config_key)
    }
  )
}

export function ask_about_context_using_command(
  context: vscode.ExtensionContext,
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand(
    'codeWebChat.askAboutContextUsing',
    async () => {
      if (!websocket_server_instance.is_connected_with_browser()) {
        vscode.window.showInformationMessage(
          'Could not connect to the web browser. Please check if it is running and if the connector extension is installed.'
        )
        return
      }
      const instructions = await get_chat_instructions(context)
      if (!instructions) return

      const config = vscode.workspace.getConfiguration('codeWebChat')
      const presets_config_key = 'chatPresetsForAskAboutContext'
      const web_chat_presets = config.get<ConfigPresetFormat[]>(
        presets_config_key,
        []
      )

      const selected_preset = await create_preset_quick_pick(
        context,
        web_chat_presets,
        'Select preset'
      )

      if (!selected_preset) return

      const chats = await process_chat_instructions(
        instructions,
        [selected_preset.name],
        context,
        workspace_provider,
        open_editors_provider,
        presets_config_key,
        { with_context: true, with_edit_format: false }
      )
      if (!chats) return

      websocket_server_instance.initialize_chats(chats, presets_config_key)
    }
  )
}

export function no_context_chat_command(
  context: vscode.ExtensionContext,
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand(
    'codeWebChat.noContextChat',
    async () => {
      if (!websocket_server_instance.is_connected_with_browser()) {
        vscode.window.showInformationMessage(
          'Could not connect to the web browser. Please check if it is running and if the connector extension is installed.'
        )
        return
      }
      const instructions = await get_chat_instructions(context)
      if (!instructions) return

      const config = vscode.workspace.getConfiguration('codeWebChat')
      const presets_config_key = 'chatPresetsForNoContext'
      const chat_presets = config.get<ConfigPresetFormat[]>(
        presets_config_key,
        []
      )

      const default_preset = chat_presets.find((p) => p.isDefault)
      let selected_names: string[] = []

      if (default_preset) {
        selected_names = [default_preset.name]
      } else {
        const selected_preset = await create_preset_quick_pick(
          context,
          chat_presets,
          'Select preset'
        )

        if (!selected_preset) return

        selected_names = [selected_preset.name]
      }

      const chats = await process_chat_instructions(
        instructions,
        selected_names,
        context,
        workspace_provider,
        open_editors_provider,
        presets_config_key,
        { with_context: false, with_edit_format: false }
      )
      if (!chats) return

      websocket_server_instance.initialize_chats(chats, presets_config_key)
    }
  )
}

export function no_context_chat_using_command(
  context: vscode.ExtensionContext,
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider,
  websocket_server_instance: WebSocketManager
) {
  return vscode.commands.registerCommand(
    'codeWebChat.noContextChatUsing',
    async () => {
      if (!websocket_server_instance.is_connected_with_browser()) {
        vscode.window.showInformationMessage(
          'Could not connect to the web browser. Please check if it is running and if the connector extension is installed.'
        )
        return
      }
      const instructions = await get_chat_instructions(context)
      if (!instructions) return

      const config = vscode.workspace.getConfiguration('codeWebChat')
      const presets_config_key = 'chatPresetsForNoContext'
      const web_chat_presets = config.get<ConfigPresetFormat[]>(
        presets_config_key,
        []
      )

      const selected_preset = await create_preset_quick_pick(
        context,
        web_chat_presets,
        'Select preset'
      )

      if (!selected_preset) return

      const chats = await process_chat_instructions(
        instructions,
        [selected_preset.name],
        context,
        workspace_provider,
        open_editors_provider,
        presets_config_key,
        { with_context: false, with_edit_format: false }
      )
      if (!chats) return

      websocket_server_instance.initialize_chats(chats, presets_config_key)
    }
  )
}
