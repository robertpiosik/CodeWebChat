import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/view/backend/utils/replace-selection-placeholder'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import { replace_changes_placeholder } from '@/view/backend/utils/replace-changes-placeholder'
import { chat_code_completion_instructions } from '@/constants/instructions'
import {
  get_last_group_or_preset_choice_state_key,
  get_last_selected_group_state_key,
  get_last_selected_preset_key
} from '@/constants/state-keys'
import { ConfigPresetFormat } from '../utils/preset-format-converters'
import { HOME_VIEW_TYPES } from '@/view/types/home-view-type'
import { extract_file_paths_from_instruction } from '@/utils/extract-file-paths-from-instruction'
import { WebMode } from '@shared/types/modes'
import { CHATBOTS } from '@shared/constants/chatbots'
import { update_last_used_preset_or_group } from './update-last-used-preset-or-group'

/**
 * When preset_names is an emtpy stirng - show quick pick,
 * if undefiend - use recently used preset/group.
 */
export const handle_send_prompt = async (params: {
  provider: ViewProvider
  preset_name?: string
  group_name?: string
  show_quick_pick?: boolean
}): Promise<void> => {
  if (
    params.provider.home_view_type === HOME_VIEW_TYPES.WEB &&
    !params.provider.websocket_server_instance.is_connected_with_browser()
  ) {
    vscode.window.showWarningMessage(
      'Browser extension is not connected. Please install or reload it.'
    )
    return
  }

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

  const active_editor = vscode.window.activeTextEditor
  const active_path = active_editor?.document.uri.fsPath

  if (is_in_code_completions_mode && !active_editor) {
    vscode.window.showWarningMessage('No editor is open.')
    return
  }

  const resolved_preset_names = await resolve_presets({
    provider: params.provider,
    preset_name: params.preset_name,
    group_name: params.group_name,
    context: params.provider.context,
    show_quick_pick: params.show_quick_pick
  })

  if (resolved_preset_names.length == 0) {
    return
  }

  if (params.preset_name !== undefined || params.group_name) {
    update_last_used_preset_or_group({
      provider: params.provider,
      preset_name: params.preset_name,
      group_name: params.group_name
    })
  }

  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector(
    params.provider.workspace_provider,
    params.provider.open_editors_provider,
    params.provider.websites_provider
  )

  if (is_in_code_completions_mode) {
    const document = active_editor!.document
    const position = active_editor!.selection.active

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )

    const completion_instructions = params.provider.code_completion_instructions
    const additional_paths = completion_instructions
      ? extract_file_paths_from_instruction(completion_instructions)
      : []

    const context_text = await files_collector.collect_files({
      exclude_path: active_path,
      additional_paths
    })

    const relative_path = vscode.workspace.asRelativePath(document.uri)

    const main_instructions = chat_code_completion_instructions(
      relative_path,
      position.line,
      position.character
    )

    const payload = {
      before: `<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const text = `${main_instructions}\n${payload.before}${
      completion_instructions
        ? `<missing_text>${completion_instructions}</missing_text>`
        : '<missing_text>'
    }${payload.after}\n${main_instructions}`

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

    const additional_paths =
      extract_file_paths_from_instruction(current_instructions)

    const context_text = await files_collector.collect_files({
      additional_paths,
      no_context: params.provider.web_mode == 'no-context'
    })

    if (
      !context_text &&
      (params.provider.web_mode == 'edit-context' ||
        params.provider.web_mode == 'ask')
    ) {
      vscode.window.showWarningMessage('Unable to work with empty context.')
      return
    }

    const chats = await Promise.all(
      resolved_preset_names.map(async (preset_name) => {
        let instructions = apply_preset_affixes_to_instruction(
          current_instructions,
          preset_name,
          params.provider.get_presets_config_key()
        )

        if (editor && !editor.selection.isEmpty) {
          if (instructions.includes('#Selection')) {
            instructions = replace_selection_placeholder(instructions)
          }
        }

        let pre_context_instructions = instructions
        let post_context_instructions = instructions
        if (pre_context_instructions.includes('#Changes:')) {
          pre_context_instructions = await replace_changes_placeholder(
            pre_context_instructions
          )
        }

        if (pre_context_instructions.includes('#SavedContext:')) {
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
            const system_instructions = `<system>\n${edit_format_instructions}\n</system>`
            pre_context_instructions += `\n${system_instructions}`
            post_context_instructions += `\n${system_instructions}`
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
  context: vscode.ExtensionContext,
  mode: WebMode,
  provider: ViewProvider
): Promise<string[] | null> {
  const last_selected_item = context.workspaceState.get<string | undefined>(
    get_last_selected_preset_key(mode),
    undefined
  )

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { name?: string }
  >()

  const BACK_LABEL = '$(arrow-left) Back'
  const items: (vscode.QuickPickItem & { name?: string })[] = [
    { label: BACK_LABEL },
    { label: '', kind: vscode.QuickPickItemKind.Separator }
  ]

  if (presets[0]?.chatbot !== undefined) {
    items.push({
      label: 'Ungrouped',
      kind: vscode.QuickPickItemKind.Separator
    })
  }

  items.push(
    ...presets.map((preset) => {
      if (!preset.chatbot) {
        const is_unnamed_group =
          !preset.name || /^\(\d+\)$/.test(preset.name.trim())
        return {
          label: is_unnamed_group ? 'Unnamed group' : preset.name,
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
  )

  quick_pick.items = items
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

  return new Promise<string[] | null>((resolve) => {
    const disposables: vscode.Disposable[] = []

    quick_pick.onDidAccept(async () => {
      const selected = quick_pick.selectedItems[0] as any

      if (selected?.label === BACK_LABEL) {
        quick_pick.hide()
        resolve(null)
        return
      }

      quick_pick.hide()

      if (selected && selected.name !== undefined) {
        const selected_name = selected.name
        context.workspaceState.update(
          get_last_selected_preset_key(mode),
          selected_name
        )
        provider.send_message({
          command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
          mode,
          name: selected_name
        })
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
  preset_name?: string
  group_name?: string
  show_quick_pick?: boolean
  context: vscode.ExtensionContext
}): Promise<string[]> {
  const last_group_or_preset_choice_state_key =
    get_last_group_or_preset_choice_state_key(params.provider.web_mode)
  const last_selected_preset_key = get_last_selected_preset_key(
    params.provider.web_mode
  )
  const last_selected_group_state_key = get_last_selected_group_state_key(
    params.provider.web_mode
  )

  const PRESET = 'Preset'
  const GROUP = 'Group'
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = params.provider.get_presets_config_key()
  const all_presets = config.get<ConfigPresetFormat[]>(presets_config_key, [])
  const is_in_code_completions_mode =
    params.provider.web_mode == 'code-completions'

  let current_instructions = ''
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

  const get_is_preset_disabled = (preset: ConfigPresetFormat) =>
    preset.chatbot &&
    (!params.provider.websocket_server_instance.is_connected_with_browser() ||
      (is_in_code_completions_mode &&
        (!params.provider.has_active_editor ||
          params.provider.has_active_selection)) ||
      (!is_in_code_completions_mode &&
        !(current_instructions || preset.promptPrefix || preset.promptSuffix)))

  if (params.preset_name !== undefined) {
    const preset = all_presets.find((p) => p.name == params.preset_name)
    if (preset) {
      if (get_is_preset_disabled(preset)) {
        if (
          !is_in_code_completions_mode &&
          !current_instructions &&
          !preset.promptPrefix &&
          !preset.promptSuffix
        ) {
          vscode.window.showWarningMessage('Type something to use this preset.')
        }
        return []
      }
      return [params.preset_name]
    }
  } else if (params.group_name) {
    const default_presets_in_group: ConfigPresetFormat[] = []

    if (params.group_name == 'Ungrouped') {
      for (const preset of all_presets) {
        if (!preset.chatbot) break
        if (preset.isSelected) {
          default_presets_in_group.push(preset)
        }
      }
    } else {
      const group_index = all_presets.findIndex(
        (p) => p.name == params.group_name
      )
      if (group_index != -1) {
        for (let i = group_index + 1; i < all_presets.length; i++) {
          const preset = all_presets[i]
          if (!preset.chatbot) {
            break
          } else if (preset.isSelected) {
            default_presets_in_group.push(preset)
          }
        }
      }
    }

    const runnable_presets = default_presets_in_group.filter(
      (preset) => !get_is_preset_disabled(preset)
    )
    const preset_names = runnable_presets.map((preset) => preset.name)

    if (preset_names.length > 0) {
      if (preset_names.length < default_presets_in_group.length) {
        const disabled_presets = default_presets_in_group.filter(
          (p) => !preset_names.includes(p.name)
        )
        const any_disabled_due_to_instructions = disabled_presets.some(
          (p) =>
            !is_in_code_completions_mode &&
            !current_instructions &&
            !p.promptPrefix &&
            !p.promptSuffix
        )
        if (any_disabled_due_to_instructions) {
          vscode.window.showWarningMessage(
            'Some presets were not run due to missing instructions.'
          )
        }
      }
      return preset_names
    }

    if (default_presets_in_group.length > 0) {
      const any_disabled_due_to_instructions = default_presets_in_group.some(
        (p) =>
          !is_in_code_completions_mode &&
          !current_instructions &&
          !p.promptPrefix &&
          !p.promptSuffix
      )
      if (any_disabled_due_to_instructions) {
        vscode.window.showWarningMessage('Type something to use this group.')
        return []
      }
    }
    vscode.window.showWarningMessage(
      'The chosen group has no selected presets to run.'
    )
    return []
  } else {
    // Both preset_name and group_name are undefined.
    // This indicates a generic "send" action, where we should
    // use the last selected preset/group or prompt the user.
    // It also handles cases where a specified preset/group was not found.
  }

  if (!params.show_quick_pick) {
    if (params.preset_name === undefined && params.group_name === undefined) {
      // Try to use last selection if "Send" button is clicked without specific preset/group
      const last_choice = params.context.workspaceState.get<string>(
        last_group_or_preset_choice_state_key
      )

      if (last_choice == PRESET) {
        const last_preset_name = params.context.workspaceState.get<string>(
          last_selected_preset_key
        )
        if (last_preset_name !== undefined) {
          const preset = all_presets.find((p) => p.name === last_preset_name)
          if (preset) {
            if (get_is_preset_disabled(preset)) {
              if (
                !is_in_code_completions_mode &&
                !current_instructions &&
                !preset.promptPrefix &&
                !preset.promptSuffix
              ) {
                vscode.window.showWarningMessage(
                  'Type something to use this preset.'
                )
              }
            } else {
              return [last_preset_name]
            }
          }
        }
      } else if (last_choice == GROUP) {
        const last_group = params.context.workspaceState.get<string>(
          last_selected_group_state_key
        )
        if (last_group) {
          if (last_group == 'Ungrouped') {
            const first_group_index = all_presets.findIndex((p) => !p.chatbot)
            const relevant_presets =
              first_group_index == -1
                ? all_presets
                : all_presets.slice(0, first_group_index)
            const preset_names = relevant_presets
              .filter((p) => p.isSelected && !get_is_preset_disabled(p))
              .map((p) => p.name)
            if (preset_names.length > 0) return preset_names
          } else {
            const group_index = all_presets.findIndex(
              (p) => p.name == last_group
            )
            const preset_names: string[] = []
            if (group_index != -1) {
              for (let i = group_index + 1; i < all_presets.length; i++) {
                const preset = all_presets[i]
                if (!preset.chatbot) {
                  break // next group
                }
                if (preset.isSelected && !get_is_preset_disabled(preset)) {
                  preset_names.push(preset.name)
                }
              }
            }
            if (preset_names.length > 0) return preset_names
          }
        }
      }
    } else {
      const last_choice = params.context.workspaceState.get<string>(
        last_group_or_preset_choice_state_key
      )

      if (last_choice == PRESET) {
        const last_preset_name = params.context.workspaceState.get<string>(
          last_selected_preset_key
        )
        if (last_preset_name !== undefined) {
          const preset = all_presets.find((p) => p.name == last_preset_name)
          if (preset) {
            if (get_is_preset_disabled(preset)) {
              if (
                !is_in_code_completions_mode &&
                !current_instructions &&
                !preset.promptPrefix &&
                !preset.promptSuffix
              ) {
                vscode.window.showWarningMessage(
                  'Type something to use this preset.'
                )
              }
            } else {
              return [last_preset_name]
            }
          }
        }
      } else if (last_choice == GROUP) {
        const last_group = params.context.workspaceState.get<string>(
          last_selected_group_state_key
        )
        if (last_group) {
          if (last_group == 'Ungrouped') {
            const first_group_index = all_presets.findIndex((p) => !p.chatbot)
            const relevant_presets =
              first_group_index == -1
                ? all_presets
                : all_presets.slice(0, first_group_index)
            const preset_names = relevant_presets
              .filter((p) => p.isSelected && !get_is_preset_disabled(p))
              .map((p) => p.name)
            if (preset_names.length > 0) return preset_names
          } else {
            const group_index = all_presets.findIndex(
              (p) => p.name == last_group
            )
            const preset_names: string[] = []
            if (group_index != -1) {
              for (let i = group_index + 1; i < all_presets.length; i++) {
                const preset = all_presets[i]
                if (!preset.chatbot) {
                  break // next group
                }
                if (preset.isSelected && !get_is_preset_disabled(preset)) {
                  preset_names.push(preset.name)
                }
              }
            }
            if (preset_names.length > 0) return preset_names
          }
        }
      }
    }
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choice = await new Promise<string | undefined>((resolve) => {
      const quick_pick = vscode.window.createQuickPick()
      const items: vscode.QuickPickItem[] = [
        {
          label: PRESET,
          description: 'Initialize only a selected preset'
        },
        {
          label: GROUP,
          description: 'Simultaneously run all selected presets within a group'
        }
      ]
      quick_pick.items = items
      quick_pick.placeholder = 'Select what to initialize'
      const last_choice = params.context.workspaceState.get<string>(
        last_group_or_preset_choice_state_key
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
      last_group_or_preset_choice_state_key,
      choice
    )

    if (choice == GROUP) {
      const group_items_from_config = all_presets
        .filter((p) => !p.chatbot)
        .map((group) => {
          const group_index = all_presets.indexOf(group)
          let default_presets_count = 0
          for (let i = group_index + 1; i < all_presets.length; i++) {
            const preset = all_presets[i]
            if (!preset.chatbot) {
              break // next group
            }
            if (preset.isSelected) {
              default_presets_count++
            }
          }
          const is_unnamed_group =
            !group.name || /^\(\d+\)$/.test(group.name.trim())
          return {
            label: is_unnamed_group ? 'Unnamed group' : group.name,
            name: group.name,
            description: `${default_presets_count} selected preset${
              default_presets_count != 1 ? 's' : ''
            }`
          }
        })

      const first_group_index = all_presets.findIndex((p) => !p.chatbot)
      if (first_group_index > 0) {
        const ungrouped_presets = all_presets.slice(0, first_group_index)
        const default_presets_count = ungrouped_presets.filter(
          (p) => p.isSelected
        ).length
        group_items_from_config.unshift({
          label: 'Ungrouped',
          name: 'Ungrouped',
          description: `${default_presets_count} selected preset${
            default_presets_count != 1 ? 's' : ''
          }`
        })
      } else if (first_group_index == -1 && all_presets.length > 0) {
        const default_presets_count = all_presets.filter(
          (p) => p.isSelected
        ).length
        group_items_from_config.unshift({
          label: 'Ungrouped',
          name: 'Ungrouped',
          description: `${default_presets_count} selected preset${
            default_presets_count != 1 ? 's' : ''
          }`
        })
      }

      const BACK_LABEL = '$(arrow-left) Back'
      const group_items = [
        { label: BACK_LABEL, name: '__BACK__' },
        { label: '', name: '', kind: vscode.QuickPickItemKind.Separator },
        ...group_items_from_config
      ]

      const quick_pick = vscode.window.createQuickPick<
        vscode.QuickPickItem & { name: string }
      >()
      quick_pick.items = group_items
      quick_pick.placeholder = 'Select a group'

      const last_selected_group = params.context.workspaceState.get<string>(
        last_selected_group_state_key,
        ''
      )
      if (last_selected_group) {
        const last_item = group_items.find(
          (item) => item.name == last_selected_group
        )
        if (last_item) {
          quick_pick.activeItems = [last_item]
        }
      }

      const result = await new Promise<string[] | null>((resolve) => {
        const disposables: vscode.Disposable[] = []

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          quick_pick.hide()

          if (!selected) {
            resolve([])
            return
          }

          if (selected.name === '__BACK__') {
            resolve(null)
            return
          }

          const group_name = selected.name
          params.context.workspaceState.update(
            last_selected_group_state_key,
            group_name
          )
          params.provider.send_message({
            command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
            mode: params.provider.web_mode,
            name: group_name
          })

          const default_presets_in_group: ConfigPresetFormat[] = []
          if (group_name == 'Ungrouped') {
            const first_group_index = all_presets.findIndex((p) => !p.chatbot)
            const relevant_presets =
              first_group_index == -1
                ? all_presets
                : all_presets.slice(0, first_group_index)
            default_presets_in_group.push(
              ...relevant_presets.filter((p) => p.isSelected)
            )
          } else {
            const group_index = all_presets.findIndex(
              (p) => p.name == group_name
            )
            if (group_index != -1) {
              for (let i = group_index + 1; i < all_presets.length; i++) {
                const preset = all_presets[i]
                if (!preset.chatbot) {
                  break // next group
                }
                if (preset.isSelected) {
                  default_presets_in_group.push(preset)
                }
              }
            }
          }

          const runnable_presets = default_presets_in_group.filter(
            (p) => !get_is_preset_disabled(p)
          )
          const preset_names = runnable_presets.map((p) => p.name)

          if (preset_names.length > 0) {
            if (runnable_presets.length < default_presets_in_group.length) {
              const disabled_presets = default_presets_in_group.filter(
                (p) => !preset_names.includes(p.name)
              )
              const any_disabled_due_to_instructions = disabled_presets.some(
                (p) =>
                  !is_in_code_completions_mode &&
                  !current_instructions &&
                  !p.promptPrefix &&
                  !p.promptSuffix
              )
              if (any_disabled_due_to_instructions) {
                vscode.window.showWarningMessage(
                  'Some presets were not run due to missing instructions.'
                )
              }
            }
          } else {
            if (default_presets_in_group.length > 0) {
              const any_disabled_due_to_instructions =
                default_presets_in_group.some(
                  (p) =>
                    !is_in_code_completions_mode &&
                    !current_instructions &&
                    !p.promptPrefix &&
                    !p.promptSuffix
                )
              if (any_disabled_due_to_instructions) {
                vscode.window.showWarningMessage(
                  'Type something to use this group.'
                )
              } else {
                vscode.window.showWarningMessage(
                  'The chosen group has no selected presets to run.'
                )
              }
            } else {
              vscode.window.showWarningMessage(
                'The chosen group has no selected presets to run.'
              )
            }
          }
          resolve(preset_names)
        })

        quick_pick.onDidHide(() => {
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
          resolve([])
        })

        disposables.push(quick_pick)
        quick_pick.show()
      })
      if (result === null) {
        continue
      }
      return result
    }

    // choice == PRESET
    const preset_result = await show_preset_quick_pick(
      all_presets,
      params.context,
      params.provider.web_mode,
      params.provider
    )
    if (preset_result === null) {
      continue
    }
    if (preset_result.length == 1) {
      const preset_name = preset_result[0]
      const preset = all_presets.find((p) => p.name == preset_name)
      if (preset && get_is_preset_disabled(preset)) {
        if (
          !is_in_code_completions_mode &&
          !current_instructions &&
          !preset.promptPrefix &&
          !preset.promptSuffix
        ) {
          vscode.window.showWarningMessage('Type something to use this preset.')
        }
        return []
      }
    }
    return preset_result
  }
}
