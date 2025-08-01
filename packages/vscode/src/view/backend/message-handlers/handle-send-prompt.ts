import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/utils/replace-selection-placeholder'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import {
  LAST_GROUP_OR_PRESET_CHOICE_STATE_KEY,
  LAST_SELECTED_GROUP_STATE_KEY,
  LAST_SELECTED_PRESET_KEY
} from '@/constants/state-keys'
import { replace_changes_placeholder } from '@/utils/replace-changes-placeholder'
import { chat_code_completion_instructions } from '@/constants/instructions'
import { ConfigPresetFormat } from '../helpers/preset-format-converters'
import { CHATBOTS } from '@shared/constants/chatbots'

export const handle_send_prompt = async (
  provider: ViewProvider,
  preset_names: string[]
): Promise<void> => {
  let current_instructions = ''
  const is_in_code_completions_mode = provider.web_mode == 'code-completions'

  if (is_in_code_completions_mode) {
    current_instructions = provider.code_completion_instructions
  } else {
    if (provider.web_mode == 'ask') {
      current_instructions = provider.ask_instructions
    } else if (provider.web_mode == 'edit-context') {
      current_instructions = provider.edit_instructions
    } else if (provider.web_mode == 'no-context') {
      current_instructions = provider.no_context_instructions
    }
  }

  const valid_preset_names = await validate_presets({
    provider,
    preset_names: preset_names,
    context: provider.context
  })

  if (valid_preset_names.length == 0) return

  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector(
    provider.workspace_provider,
    provider.open_editors_provider,
    provider.websites_provider
  )

  const active_editor = vscode.window.activeTextEditor
  const active_path = active_editor?.document.uri.fsPath

  if (provider.web_mode == 'code-completions') {
    if (!active_editor) return

    const document = active_editor.document
    const position = active_editor.selection.active

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
    const relative_path = active_path!.replace(workspace_folder + '/', '')

    const instructions = `${chat_code_completion_instructions(
      relative_path,
      position.line,
      position.character
    )}${
      provider.code_completion_instructions
        ? ` Follow instructions: ${provider.code_completion_instructions}`
        : ''
    }`

    const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

    const chats = valid_preset_names.map((preset_name) => {
      return {
        text,
        preset_name
      }
    })

    provider.websocket_server_instance.initialize_chats(
      chats,
      provider.get_presets_config_key()
    )
  } else {
    const editor = vscode.window.activeTextEditor

    const context_text =
      provider.web_mode != 'no-context'
        ? await files_collector.collect_files()
        : ''

    const chats = await Promise.all(
      valid_preset_names.map(async (preset_name) => {
        let instructions = apply_preset_affixes_to_instruction(
          current_instructions,
          preset_name,
          provider.get_presets_config_key()
        )

        if (editor && !editor.selection.isEmpty) {
          if (instructions.includes('@Selection')) {
            instructions = replace_selection_placeholder(instructions)
          }
        }

        let pre_context_instructions = instructions
        let post_context_instructions = instructions
        if (pre_context_instructions.includes('@Changes:')) {
          pre_context_instructions = await replace_changes_placeholder(
            pre_context_instructions
          )
        }

        if (pre_context_instructions.includes('@SavedContext:')) {
          pre_context_instructions = await replace_saved_context_placeholder(
            pre_context_instructions,
            provider.context,
            provider.workspace_provider
          )
          post_context_instructions = await replace_saved_context_placeholder(
            post_context_instructions,
            provider.context,
            provider.workspace_provider,
            true
          )
        }

        if (provider.web_mode == 'edit-context') {
          const all_instructions = vscode.workspace
            .getConfiguration('codeWebChat')
            .get<{ [key: string]: string }>('editFormatInstructions')
          const edit_format_instructions =
            all_instructions?.[provider.chat_edit_format]
          if (edit_format_instructions) {
            pre_context_instructions += `\n${edit_format_instructions}`
            post_context_instructions += `\n${edit_format_instructions}`
          }
        }

        return {
          text: context_text
            ? `${pre_context_instructions}\n<files>\n${context_text}</files>\n${post_context_instructions}`
            : pre_context_instructions,
          preset_name
        }
      })
    )

    provider.websocket_server_instance.initialize_chats(
      chats,
      provider.get_presets_config_key()
    )
  }

  vscode.window.showInformationMessage(
    valid_preset_names.length > 1
      ? 'Chats have been initialized in the connected browser.'
      : 'Chat has been initialized in the connected browser.'
  )
}

async function show_preset_quick_pick(
  presets: ConfigPresetFormat[],
  context: vscode.ExtensionContext
): Promise<string[]> {
  const last_selected_item = context.workspaceState.get<string>(
    LAST_SELECTED_PRESET_KEY,
    ''
  )

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { name?: string }
  >()

  quick_pick.items = presets.map((preset) => {
    if (!preset.chatbot) {
      return {
        label: preset.name,
        kind: vscode.QuickPickItemKind.Separator
      }
    }
    const is_unnamed = !preset.name || /^\(\d+\)$/.test(preset.name.trim())
    const chatbot_models = CHATBOTS[preset.chatbot as keyof typeof CHATBOTS]
      .models as any
    const model = preset.model
      ? chatbot_models[preset.model]?.label || preset.model
      : ''

    return {
      label: is_unnamed ? preset.chatbot! : preset.name,
      name: preset.name,
      description: is_unnamed
        ? model
        : `${preset.chatbot}${model ? ` · ${model}` : ''}`
    }
  })
  quick_pick.placeholder = 'Select preset'
  quick_pick.matchOnDescription = true

  if (last_selected_item) {
    const last_item = quick_pick.items.find(
      (item) => item.name == last_selected_item
    )
    if (last_item) {
      quick_pick.activeItems = [last_item]
    }
  }

  return new Promise<string[]>((resolve) => {
    const disposables: vscode.Disposable[] = []

    quick_pick.onDidAccept(async () => {
      const selected = quick_pick.selectedItems[0] as any
      quick_pick.hide()

      if (selected && selected.name) {
        const selected_name = selected.name
        context.workspaceState.update(LAST_SELECTED_PRESET_KEY, selected_name)
        resolve([selected_name])
      } else {
        resolve([])
      }
    })

    quick_pick.onDidHide(() => {
      disposables.forEach((d) => d.dispose())
      quick_pick.dispose()
      resolve([])
    })

    disposables.push(quick_pick)
    quick_pick.show()
  })
}

async function validate_presets(params: {
  provider: ViewProvider
  preset_names: string[]
  context: vscode.ExtensionContext
}): Promise<string[]> {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = params.provider.get_presets_config_key()
  const all_presets = config.get<ConfigPresetFormat[]>(presets_config_key, [])
  const available_preset_names = all_presets.map((preset) => preset.name)

  const valid_presets = params.preset_names.filter((name) =>
    available_preset_names.includes(name)
  )

  if (valid_presets.length > 0) {
    return valid_presets
  }

  const hasGroups = all_presets.some((p) => !p.chatbot)

  if (hasGroups) {
    const choice = await new Promise<string | undefined>((resolve) => {
      const quickPick = vscode.window.createQuickPick()
      const items: vscode.QuickPickItem[] = ['Groups', 'Presets'].map(
        (label) => ({ label })
      )
      quickPick.items = items
      quickPick.placeholder = 'Select from Groups or individual Presets'
      const lastChoice = params.context.workspaceState.get<string>(
        LAST_GROUP_OR_PRESET_CHOICE_STATE_KEY
      )
      if (lastChoice) {
        const lastItem = items.find((item) => item.label === lastChoice)
        if (lastItem) {
          quickPick.activeItems = [lastItem]
        }
      }
      quickPick.onDidAccept(() => {
        const selection = quickPick.selectedItems[0]
        resolve(selection ? selection.label : undefined)
        quickPick.hide()
      })
      quickPick.onDidHide(() => {
        resolve(undefined)
        quickPick.dispose()
      })
      quickPick.show()
    })

    if (!choice) {
      return []
    }

    params.context.workspaceState.update(
      LAST_GROUP_OR_PRESET_CHOICE_STATE_KEY,
      choice
    )

    if (choice == 'Groups') {
      const groupItems = all_presets
        .filter((p) => !p.chatbot)
        .map((group) => {
          const group_index = all_presets.indexOf(group)
          let default_presets_count = 0
          for (let i = group_index + 1; i < all_presets.length; i++) {
            const preset = all_presets[i]
            if (!preset.chatbot) {
              break // next group
            }
            if (preset.isDefault) {
              default_presets_count++
            }
          }
          return {
            label: group.name,
            name: group.name,
            description: `${default_presets_count} default presets`
          }
        })

      const quick_pick = vscode.window.createQuickPick<
        vscode.QuickPickItem & { name: string }
      >()
      quick_pick.items = groupItems
      quick_pick.placeholder = 'Select a group'

      const last_selected_group = params.context.workspaceState.get<string>(
        LAST_SELECTED_GROUP_STATE_KEY,
        ''
      )
      if (last_selected_group) {
        const last_item = groupItems.find(
          (item) => item.name === last_selected_group
        )
        if (last_item) {
          quick_pick.activeItems = [last_item]
        }
      }

      return new Promise<string[]>((resolve) => {
        const disposables: vscode.Disposable[] = []

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          quick_pick.hide()

          if (selected) {
            const groupName = selected.name
            params.context.workspaceState.update(
              LAST_SELECTED_GROUP_STATE_KEY,
              groupName
            )
            const group_index = all_presets.findIndex(
              (p) => p.name == groupName
            )
            const preset_names: string[] = []
            if (group_index != -1) {
              for (let i = group_index + 1; i < all_presets.length; i++) {
                const preset = all_presets[i]
                if (!preset.chatbot) {
                  break // next group
                }
                if (preset.isDefault) {
                  preset_names.push(preset.name)
                }
              }
            }
            resolve(preset_names)
          } else {
            resolve([])
          }
        })

        quick_pick.onDidHide(() => {
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
          resolve([])
        })

        disposables.push(quick_pick)
        quick_pick.show()
      })
    }

    // choice == 'Presets'
    return show_preset_quick_pick(all_presets, params.context)
  }

  return show_preset_quick_pick(all_presets, params.context)
}
