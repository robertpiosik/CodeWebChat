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

export const handle_send_prompt = async (params: {
  provider: ViewProvider
  preset_names?: string[]
}): Promise<void> => {
  let current_instructions = ''
  const is_in_code_completions_mode =
    params.provider.web_mode == 'code-completions'

  if (is_in_code_completions_mode) {
    current_instructions = params.provider.code_completion_instructions
  } else {
    if (params.provider.web_mode == 'ask') {
      current_instructions = params.provider.ask_instructions
    } else if (params.provider.web_mode == 'edit-context') {
      current_instructions = params.provider.edit_instructions
    } else if (params.provider.web_mode == 'no-context') {
      current_instructions = params.provider.no_context_instructions
    }
  }

  const resolved_preset_names = await resolve_presets({
    provider: params.provider,
    preset_names: params.preset_names,
    context: params.provider.context
  })

  if (resolved_preset_names.length == 0) return

  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector(
    params.provider.workspace_provider,
    params.provider.open_editors_provider,
    params.provider.websites_provider
  )

  const active_editor = vscode.window.activeTextEditor
  const active_path = active_editor?.document.uri.fsPath

  if (params.provider.web_mode == 'code-completions') {
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
      params.provider.code_completion_instructions
        ? ` Follow instructions: ${params.provider.code_completion_instructions}`
        : ''
    }`

    const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

    const chats = resolved_preset_names.map((preset_name) => {
      return {
        text,
        preset_name
      }
    })

    params.provider.websocket_server_instance.initialize_chats(
      chats,
      params.provider.get_presets_config_key()
    )
  } else {
    const editor = vscode.window.activeTextEditor

    const context_text =
      params.provider.web_mode != 'no-context'
        ? await files_collector.collect_files()
        : ''

    const chats = await Promise.all(
      resolved_preset_names.map(async (preset_name) => {
        let instructions = apply_preset_affixes_to_instruction(
          current_instructions,
          preset_name,
          params.provider.get_presets_config_key()
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
            params.provider.context,
            params.provider.workspace_provider
          )
          post_context_instructions = await replace_saved_context_placeholder(
            post_context_instructions,
            params.provider.context,
            params.provider.workspace_provider,
            true
          )
        }

        if (params.provider.web_mode == 'edit-context') {
          const all_instructions = vscode.workspace
            .getConfiguration('codeWebChat')
            .get<{ [key: string]: string }>('editFormatInstructions')
          const edit_format_instructions =
            all_instructions?.[params.provider.chat_edit_format]
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

    params.provider.websocket_server_instance.initialize_chats(
      chats,
      params.provider.get_presets_config_key()
    )
  }

  vscode.window.showInformationMessage(
    resolved_preset_names.length > 1
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

  if (last_selected_item !== undefined) {
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

      if (selected && selected.name !== undefined) {
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

async function resolve_presets(params: {
  provider: ViewProvider
  preset_names?: string[]
  context: vscode.ExtensionContext
}): Promise<string[]> {
  const GROUPS = 'Groups'
  const PRESETS = 'Presets'
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = params.provider.get_presets_config_key()
  const all_presets = config.get<ConfigPresetFormat[]>(presets_config_key, [])
  const available_preset_names = all_presets.map((preset) => preset.name)

  if (params.preset_names !== undefined) {
    const valid_presets = params.preset_names.filter((name) =>
      available_preset_names.includes(name)
    )

    if (valid_presets.length > 0) {
      return valid_presets
    }
  } else {
    // preset_names is undefined, try to use last selection
    const last_choice = params.context.workspaceState.get<string>(
      LAST_GROUP_OR_PRESET_CHOICE_STATE_KEY
    )

    if (last_choice === PRESETS) {
      const last_preset = params.context.workspaceState.get<string>(
        LAST_SELECTED_PRESET_KEY
      )
      if (last_preset && available_preset_names.includes(last_preset)) {
        return [last_preset]
      }
    } else if (last_choice === GROUPS) {
      const last_group = params.context.workspaceState.get<string>(
        LAST_SELECTED_GROUP_STATE_KEY
      )
      if (last_group) {
        if (last_group === 'Ungrouped') {
          const first_group_index = all_presets.findIndex((p) => !p.chatbot)
          const relevant_presets =
            first_group_index === -1
              ? all_presets
              : all_presets.slice(0, first_group_index)
          const preset_names = relevant_presets
            .filter((p) => p.isDefault)
            .map((p) => p.name)
          if (preset_names.length > 0) return preset_names
        } else {
          const group_index = all_presets.findIndex((p) => p.name == last_group)
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
          if (preset_names.length > 0) return preset_names
        }
      }
    }
  }

  const choice = await new Promise<string | undefined>((resolve) => {
    const quick_pick = vscode.window.createQuickPick()
    const items: vscode.QuickPickItem[] = [GROUPS, PRESETS].map((label) => ({
      label
    }))
    quick_pick.items = items
    quick_pick.placeholder = 'Select from Groups or individual Presets'
    const last_choice = params.context.workspaceState.get<string>(
      LAST_GROUP_OR_PRESET_CHOICE_STATE_KEY
    )
    if (last_choice) {
      const last_item = items.find((item) => item.label == last_choice)
      if (last_item) {
        quick_pick.activeItems = [last_item]
      }
    }
    quick_pick.onDidAccept(() => {
      const selection = quick_pick.selectedItems[0]
      resolve(selection ? selection.label : undefined)
      quick_pick.hide()
    })
    quick_pick.onDidHide(() => {
      resolve(undefined)
      quick_pick.dispose()
    })
    quick_pick.show()
  })

  if (!choice) {
    return []
  }

  params.context.workspaceState.update(
    LAST_GROUP_OR_PRESET_CHOICE_STATE_KEY,
    choice
  )

  if (choice == GROUPS) {
    const group_items = all_presets
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
          description: `${default_presets_count} selected preset${
            default_presets_count !== 1 ? 's' : ''
          }`
        }
      })

    const first_group_index = all_presets.findIndex((p) => !p.chatbot)
    if (first_group_index > 0) {
      const ungrouped_presets = all_presets.slice(0, first_group_index)
      const default_presets_count = ungrouped_presets.filter(
        (p) => p.isDefault
      ).length
      group_items.unshift({
        label: 'Ungrouped',
        name: 'Ungrouped',
        description: `${default_presets_count} selected preset${
          default_presets_count !== 1 ? 's' : ''
        }`
      })
    } else if (first_group_index === -1 && all_presets.length > 0) {
      const default_presets_count = all_presets.filter(
        (p) => p.isDefault
      ).length
      group_items.unshift({
        label: 'Ungrouped',
        name: 'Ungrouped',
        description: `${default_presets_count} selected preset${
          default_presets_count !== 1 ? 's' : ''
        }`
      })
    }

    const quick_pick = vscode.window.createQuickPick<
      vscode.QuickPickItem & { name: string }
    >()
    quick_pick.items = group_items
    quick_pick.placeholder = 'Select a group'

    const last_selected_group = params.context.workspaceState.get<string>(
      LAST_SELECTED_GROUP_STATE_KEY,
      ''
    )
    if (last_selected_group) {
      const last_item = group_items.find(
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
          if (groupName === 'Ungrouped') {
            const first_group_index = all_presets.findIndex((p) => !p.chatbot)
            const relevant_presets =
              first_group_index === -1
                ? all_presets
                : all_presets.slice(0, first_group_index)
            const preset_names = relevant_presets
              .filter((p) => p.isDefault)
              .map((p) => p.name)
            resolve(preset_names)
          } else {
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
          }
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

  // choice == PRESETS
  return show_preset_quick_pick(all_presets, params.context)
}
