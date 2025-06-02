import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/helpers/files-collector'
import { replace_selection_placeholder } from '@/utils/replace-selection-placeholder'
import { apply_preset_affixes_to_instruction } from '@/helpers/apply-preset-affixes'
import { LAST_SELECTED_PRESET_KEY } from '@/constants/state-keys'

export const handle_send_prompt = async (
  provider: ViewProvider,
  preset_names: string[]
): Promise<void> => {
  const valid_preset_names = await validate_presets({
    preset_names: preset_names,
    is_code_completions_mode: provider.is_code_completions_mode,
    context: provider.context,
    instructions: provider.instructions
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

  if (provider.is_code_completions_mode && active_editor) {
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

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const chat_code_completion_instructions = config.get<string>(
      'chatCodeCompletionsInstructions'
    )

    const instructions = `${chat_code_completion_instructions}${
      provider.code_completion_suggestions
        ? ` Follow suggestions: ${provider.code_completion_suggestions}`
        : ''
    }`

    const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

    const chats = valid_preset_names.map((preset_name) => {
      return {
        text,
        preset_name
      }
    })

    provider.websocket_server_instance.initialize_chats(chats)
  } else if (!provider.is_code_completions_mode) {
    if (!provider.instructions) return

    const context_text = await files_collector.collect_files({
      active_path
    })

    let base_instructions = provider.instructions
    base_instructions = replace_selection_placeholder(base_instructions)

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const edit_format_instructions = config.get<string>(
      `editFormatInstructions${
        provider.edit_format.charAt(0).toUpperCase() +
        provider.edit_format.slice(1)
      }`
    )

    const chats = valid_preset_names.map((preset_name) => {
      let instructions = apply_preset_affixes_to_instruction(
        base_instructions,
        preset_name
      )

      if (edit_format_instructions) {
        instructions += `\n${edit_format_instructions}`
      }

      return {
        text: context_text
          ? `${instructions}\n<files>\n${context_text}</files>\n${instructions}`
          : instructions,
        preset_name
      }
    })

    provider.websocket_server_instance.initialize_chats(chats)
  }

  vscode.window.showInformationMessage(
    valid_preset_names.length > 1
      ? 'Chats have been initialized in the connected browser.'
      : 'Chat has been initialized in the connected browser.'
  )
}

async function validate_presets(params: {
  preset_names: string[]
  is_code_completions_mode: boolean
  context: vscode.ExtensionContext
  instructions: string
}): Promise<string[]> {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets = config.get<any[]>('presets', [])
  const available_presets = presets.filter((preset) =>
    !params.is_code_completions_mode
      ? true
      : !preset.promptPrefix && !preset.promptSuffix
  )
  const available_preset_names = available_presets.map((preset) => preset.name)

  const valid_presets = params.preset_names.filter((name) =>
    available_preset_names.includes(name)
  )

  if (valid_presets.length == 0) {
    const last_selected_item = params.context.globalState.get<string>(
      LAST_SELECTED_PRESET_KEY,
      ''
    )

    const move_up_button = {
      iconPath: new vscode.ThemeIcon('chevron-up'),
      tooltip: 'Move up'
    }

    const move_down_button = {
      iconPath: new vscode.ThemeIcon('chevron-down'),
      tooltip: 'Move down'
    }

    const create_items = () => {
      const refactoring_items = !params.is_code_completions_mode
        ? [
            {
              label: 'Use refactoring API tool',
              kind: vscode.QuickPickItemKind.Default,
              command: 'refactor',
              type: 'refactoring'
            },
            {
              label: 'Use refactoring API tool using...',
              kind: vscode.QuickPickItemKind.Default,
              command: 'refactorUsing',
              type: 'refactoring'
            },
            {
              label: 'My Presets',
              kind: vscode.QuickPickItemKind.Separator,
              type: 'separator'
            }
          ]
        : [
            {
              label: 'My Presets',
              kind: vscode.QuickPickItemKind.Separator,
              type: 'separator'
            }
          ]

      const preset_items = available_presets.map((preset, index) => {
        const buttons = []

        if (available_presets.length > 1) {
          if (index > 0) {
            buttons.push(move_up_button)
          }

          if (index < available_presets.length - 1) {
            buttons.push(move_down_button)
          }
        }

        return {
          label: preset.name,
          description: `${preset.chatbot}${
            preset.model ? ` • ${preset.model}` : ''
          }`,
          index,
          buttons,
          type: 'preset'
        }
      })

      return [...refactoring_items, ...preset_items]
    }

    const quick_pick = vscode.window.createQuickPick()
    const items = create_items()
    quick_pick.items = items
    quick_pick.placeholder = 'Select preset'

    if (last_selected_item) {
      const last_item = items.find(
        (item: any) => item.label === last_selected_item
      )
      if (last_item) {
        quick_pick.activeItems = [last_item]
      }
    }

    if (!quick_pick.activeItems.length) {
      const first_preset = items.find((item: any) => item.type == 'preset')
      if (first_preset) {
        quick_pick.activeItems = [first_preset]
      } else {
        const first_selectable = items.find(
          (item: any) => item.kind !== vscode.QuickPickItemKind.Separator
        )
        if (first_selectable) {
          quick_pick.activeItems = [first_selectable]
        }
      }
    }

    return new Promise<string[]>((resolve) => {
      quick_pick.onDidTriggerItemButton(async (event) => {
        const item = event.item as any
        const button = event.button
        const index = item.index

        if (item.type != 'preset') return

        if (button.tooltip == 'Move up' && index > 0) {
          const temp = available_presets[index]
          available_presets[index] = available_presets[index - 1]
          available_presets[index - 1] = temp

          await config.update(
            'presets',
            available_presets,
            vscode.ConfigurationTarget.Global
          )

          quick_pick.items = create_items()
        } else if (
          button.tooltip == 'Move down' &&
          index < available_presets.length - 1
        ) {
          const temp = available_presets[index]
          available_presets[index] = available_presets[index + 1]
          available_presets[index + 1] = temp

          await config.update(
            'presets',
            available_presets,
            vscode.ConfigurationTarget.Global
          )

          quick_pick.items = create_items()
        }
      })

      quick_pick.onDidAccept(async () => {
        const selected = quick_pick.selectedItems[0] as any
        quick_pick.hide()

        if (selected) {
          const selected_name = selected.label

          params.context.globalState.update(
            LAST_SELECTED_PRESET_KEY,
            selected_name
          )

          if (selected.type == 'refactoring' && selected.command) {
            const instructions = replace_selection_placeholder(
              params.instructions
            )
            vscode.commands.executeCommand(`codeWebChat.${selected.command}`, {
              instructions
            })

            resolve([])
          } else if (selected.type == 'preset') {
            resolve([selected_name])
          } else {
            resolve([])
          }
        } else {
          resolve([])
        }
      })

      quick_pick.onDidHide(() => {
        quick_pick.dispose()
        resolve([])
      })

      quick_pick.show()
    })
  }

  return valid_presets
}
