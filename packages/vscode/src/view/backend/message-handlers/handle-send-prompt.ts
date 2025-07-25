import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/utils/replace-selection-placeholder'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import { LAST_SELECTED_PRESET_KEY } from '@/constants/state-keys'
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

async function validate_presets(params: {
  provider: ViewProvider
  preset_names: string[]
  context: vscode.ExtensionContext
}): Promise<string[]> {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = params.provider.get_presets_config_key()
  const presets = config.get<ConfigPresetFormat[]>(presets_config_key, [])
  const available_preset_names = presets.map((preset) => preset.name)

  const valid_presets = params.preset_names.filter((name) =>
    available_preset_names.includes(name)
  )

  if (valid_presets.length == 0) {
    const last_selected_item = params.context.globalState.get<string>(
      LAST_SELECTED_PRESET_KEY,
      ''
    )

    const quick_pick = vscode.window.createQuickPick<
      vscode.QuickPickItem & { name: string }
    >()

    quick_pick.items = presets.map((preset) => {
      const is_unnamed = !preset.name || /^\(\d+\)$/.test(preset.name.trim())
      const model = preset.model
        ? (CHATBOTS[preset.chatbot] as any).models[preset.model] || preset.model
        : ''

      return {
        label: is_unnamed ? preset.chatbot : preset.name,
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

        if (selected) {
          const selected_name = selected.name
          params.context.globalState.update(
            LAST_SELECTED_PRESET_KEY,
            selected_name
          )
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

  return valid_presets
}
