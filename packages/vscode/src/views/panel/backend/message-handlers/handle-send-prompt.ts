import { PanelProvider } from '@/views/panel/backend/panel-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/views/panel/backend/utils/replace-selection-placeholder'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import {
  replace_changes_placeholder,
  replace_context_at_commit_placeholder,
  replace_commit_placeholder
} from '@/views/panel/backend/utils/replace-git-placeholders'
import { code_completion_instructions_for_panel } from '@/constants/instructions'
import {
  get_last_selected_preset_or_group_key,
  get_recently_used_presets_or_groups_key
} from '@/constants/state-keys'
import { ConfigPresetFormat } from '../utils/preset-format-converters'
import { MODE } from '@/views/panel/types/main-view-mode'
import { WebPromptType } from '@shared/types/prompt-types'
import { CHATBOTS } from '@shared/constants/chatbots'
import { update_last_used_preset_or_group } from './update-last-used-preset-or-group'
import { dictionary } from '@shared/constants/dictionary'

export const handle_send_prompt = async (params: {
  panel_provider: PanelProvider
  preset_name?: string
  group_name?: string
  show_quick_pick?: boolean
  without_submission?: boolean
}): Promise<void> => {
  if (
    params.panel_provider.mode === MODE.WEB &&
    !params.panel_provider.websocket_server_instance.is_connected_with_browser()
  ) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.BROWSER_EXTENSION_NOT_CONNECTED
    )
    return
  }

  let current_instructions = ''
  const is_in_code_completions_mode =
    params.panel_provider.web_prompt_type == 'code-completions'

  if (is_in_code_completions_mode) {
    current_instructions = params.panel_provider.code_completion_instructions
  } else {
    if (params.panel_provider.web_prompt_type == 'ask') {
      current_instructions = params.panel_provider.ask_instructions
    } else if (params.panel_provider.web_prompt_type == 'edit-context') {
      current_instructions = params.panel_provider.edit_instructions
    } else if (params.panel_provider.web_prompt_type == 'no-context') {
      current_instructions = params.panel_provider.no_context_instructions
    }
  }

  const active_editor = vscode.window.activeTextEditor
  const active_path = active_editor?.document.uri.fsPath

  if (is_in_code_completions_mode && !active_editor) {
    vscode.window.showWarningMessage(dictionary.warning_message.NO_EDITOR_OPEN)
    return
  }

  const resolution = await resolve_presets({
    panel_provider: params.panel_provider,
    preset_name: params.preset_name,
    group_name: params.group_name,
    context: params.panel_provider.context,
    show_quick_pick: params.show_quick_pick
  })

  if (resolution.preset_names.length == 0) {
    return
  }
  const resolved_preset_names = resolution.preset_names

  if (params.preset_name !== undefined || params.group_name) {
    const name_to_save = params.preset_name ?? params.group_name!
    update_last_used_preset_or_group({
      panel_provider: params.panel_provider,
      preset_name: params.preset_name,
      group_name: params.group_name
    })
    const recents_key = get_recently_used_presets_or_groups_key(
      params.panel_provider.web_prompt_type
    )
    const recents =
      params.panel_provider.context.globalState.get<string[]>(
        recents_key,
        []
      ) ?? []
    const new_recents = [
      name_to_save,
      ...recents.filter((r) => r != name_to_save)
    ].slice(0, 10)
    params.panel_provider.context.globalState.update(recents_key, new_recents)
  }

  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector(
    params.panel_provider.workspace_provider,
    params.panel_provider.open_editors_provider,
    params.panel_provider.websites_provider
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

    const completion_instructions =
      params.panel_provider.code_completion_instructions

    const context_text = await files_collector.collect_files({
      exclude_path: active_path
    })

    const relative_path = vscode.workspace.asRelativePath(document.uri)

    const main_instructions = code_completion_instructions_for_panel(
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
        preset_name,
        raw_instructions: completion_instructions,
        mode: params.panel_provider.web_prompt_type
      }
    })

    params.panel_provider.websocket_server_instance.initialize_chats({
      chats,
      presets_config_key: params.panel_provider.get_presets_config_key(),
      without_submission:
        params.without_submission || resolution.without_submission
    })
  } else {
    const editor = vscode.window.activeTextEditor
    const additional_paths: string[] = []

    const context_text = await files_collector.collect_files({
      additional_paths,
      no_context: params.panel_provider.web_prompt_type == 'no-context'
    })

    const chats = await Promise.all(
      resolved_preset_names.map(async (preset_name) => {
        let instructions = apply_preset_affixes_to_instruction({
          instruction: current_instructions,
          preset_name: preset_name,
          presets_config_key: params.panel_provider.get_presets_config_key()
        })

        if (editor && !editor.selection.isEmpty) {
          if (instructions.includes('#Selection')) {
            instructions = replace_selection_placeholder(instructions)
          }
        }

        let pre_context_instructions = instructions
        let post_context_instructions = instructions
        if (pre_context_instructions.includes('#Changes:')) {
          const is_no_context_web_mode =
            params.panel_provider.mode == MODE.WEB &&
            params.panel_provider.web_prompt_type == 'no-context'

          pre_context_instructions = await replace_changes_placeholder({
            instruction: pre_context_instructions,
            workspace_provider: params.panel_provider.workspace_provider,
            is_no_context_web_mode
          })
          post_context_instructions = await replace_changes_placeholder({
            instruction: post_context_instructions,
            after_context: true,
            workspace_provider: params.panel_provider.workspace_provider
          })
        }

        if (pre_context_instructions.includes('#Commit:')) {
          pre_context_instructions = await replace_commit_placeholder({
            instruction: pre_context_instructions
          })
          post_context_instructions = await replace_commit_placeholder({
            instruction: post_context_instructions,
            after_context: true
          })
        }

        if (pre_context_instructions.includes('#ContextAtCommit:')) {
          pre_context_instructions =
            await replace_context_at_commit_placeholder({
              instruction: pre_context_instructions,
              workspace_provider: params.panel_provider.workspace_provider
            })
          post_context_instructions =
            await replace_context_at_commit_placeholder({
              instruction: post_context_instructions,
              after_context: true,
              workspace_provider: params.panel_provider.workspace_provider
            })
        }
        if (pre_context_instructions.includes('#SavedContext:')) {
          pre_context_instructions = await replace_saved_context_placeholder({
            instruction: pre_context_instructions,
            context: params.panel_provider.context,
            workspace_provider: params.panel_provider.workspace_provider
          })
          post_context_instructions = await replace_saved_context_placeholder({
            instruction: post_context_instructions,
            context: params.panel_provider.context,
            workspace_provider: params.panel_provider.workspace_provider,
            just_opening_tag: true
          })
        }

        if (params.panel_provider.web_prompt_type == 'edit-context') {
          const all_instructions = vscode.workspace
            .getConfiguration('codeWebChat')
            .get<{ [key: string]: string }>('editFormatInstructions')
          const edit_format_instructions =
            all_instructions?.[params.panel_provider.chat_edit_format]
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
          preset_name,
          raw_instructions: current_instructions,
          mode: params.panel_provider.web_prompt_type,
          edit_format:
            params.panel_provider.web_prompt_type === 'edit-context'
              ? params.panel_provider.chat_edit_format
              : undefined
        }
      })
    )

    params.panel_provider.websocket_server_instance.initialize_chats({
      chats,
      presets_config_key: params.panel_provider.get_presets_config_key(),
      without_submission:
        params.without_submission || resolution.without_submission
    })
  }

  params.panel_provider.send_message({
    command: 'SHOW_AUTO_CLOSING_MODAL',
    title:
      resolved_preset_names.length > 1
        ? 'Chats have been initialized in the connected browser'
        : 'Chat has been initialized in the connected browser'
  })
}

async function show_preset_quick_pick(params: {
  presets: ConfigPresetFormat[]
  context: vscode.ExtensionContext
  mode: WebPromptType
  panel_provider: PanelProvider
  get_is_preset_disabled: (preset: ConfigPresetFormat) => boolean
  is_in_code_completions_mode: boolean
  current_instructions: string
}): Promise<{ preset_names: string[]; without_submission?: boolean } | null> {
  const { presets, context, mode, panel_provider } = params

  const run_without_submission_button: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('file-media'),
    tooltip: 'Run and pause for media upload'
  }

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { preset_name?: string; group_name?: string }
  >()

  const recents_key = get_recently_used_presets_or_groups_key(mode)
  const recent_names = context.globalState.get<string[]>(recents_key, [])

  if (recent_names.length == 0) {
    vscode.window.showWarningMessage(
      'No recently used presets or groups.'
    )
    return null
  }

  const items = recent_names
    .map((name) => {
      const item = presets.find((p) => p.name == name)

      if (name == 'Ungrouped' || (item && !item.chatbot)) {
        return { label: name, group_name: name, description: 'Group' }
      }

      if (item && item.chatbot) {
        const preset = item
        const is_unnamed = !preset.name || /^\(\d+\)$/.test(preset.name.trim())
        const chatbot_models = CHATBOTS[preset.chatbot as keyof typeof CHATBOTS]
          .models as any
        const model = preset.model
          ? chatbot_models[preset.model]?.label || preset.model
          : ''
        return {
          label: `${is_unnamed ? preset.chatbot! : preset.name!}`,
          preset_name: preset.name,
          description: is_unnamed
            ? model
            : `${preset.chatbot}${model ? ` · ${model}` : ''}`,
          buttons: [run_without_submission_button]
        }
      }
      return null
    })
    .filter((i): i is NonNullable<typeof i> => i !== null)

  quick_pick.items = items
  if (items.length == 0) {
    vscode.window.showWarningMessage(
      'No recently used presets or groups.'
    )
    return null
  }
  quick_pick.placeholder = 'Search recently used presets and groups'
  quick_pick.title = 'Select Recently Used Preset or Group'
  quick_pick.matchOnDescription = true

  const last_selected_key = get_last_selected_preset_or_group_key(mode)
  const last_selected_name =
    context.workspaceState.get<string>(last_selected_key) ??
    context.globalState.get<string>(last_selected_key)

  let last_selected_preset_name: string | undefined
  if (last_selected_name) {
    const item = presets.find((p) => p.name === last_selected_name)
    if (item && item.chatbot) last_selected_preset_name = last_selected_name
  }

  if (last_selected_preset_name) {
    const last_item = quick_pick.items.find(
      (item) => item.preset_name === last_selected_preset_name
    )
    if (last_item) quick_pick.activeItems = [last_item]
  }

  return new Promise<{
    preset_names: string[]
    without_submission?: boolean
  } | null>((resolve) => {
    const disposables: vscode.Disposable[] = []
    let resolved = false
    const do_resolve = (
      value: { preset_names: string[]; without_submission?: boolean } | null
    ) => {
      if (resolved) return
      resolved = true
      resolve(value)
    }

    quick_pick.onDidTriggerItemButton(async (e) => {
      const item = e.item as any & {
        preset_name?: string
      }
      if (item.preset_name && e.button === run_without_submission_button) {
        quick_pick.hide()
        const preset = presets.find((p) => p.name === item.preset_name)!
        if (params.get_is_preset_disabled(preset)) {
          if (
            !params.is_in_code_completions_mode &&
            !params.current_instructions &&
            !preset.promptPrefix &&
            !preset.promptSuffix
          ) {
            vscode.window.showWarningMessage(
              dictionary.warning_message.TYPE_SOMETHING_TO_USE_PRESET
            )
          }
          do_resolve(null)
        } else {
          do_resolve({
            preset_names: [item.preset_name],
            without_submission: true
          })
        }
      }
    })

    quick_pick.onDidAccept(async () => {
      const selected = quick_pick.selectedItems[0] as any

      if (!selected) {
        quick_pick.hide()
        do_resolve(null)
        return
      }

      if (selected.preset_name) {
        const preset = presets.find((p) => p.name == selected.preset_name)!
        if (params.get_is_preset_disabled(preset)) {
          if (
            !params.is_in_code_completions_mode &&
            !params.current_instructions &&
            !preset.promptPrefix &&
            !preset.promptSuffix
          ) {
            vscode.window.showWarningMessage(
              dictionary.warning_message.TYPE_SOMETHING_TO_USE_PRESET
            )
          }
          do_resolve(null)
        } else {
          let group_name = 'Ungrouped'
          const preset_index = presets.findIndex(
            (p) => p.name == selected.preset_name
          )
          if (preset_index > -1) {
            for (let i = preset_index - 1; i >= 0; i--) {
              if (!presets[i].chatbot) {
                group_name = presets[i].name!
                break
              }
            }
          }
          update_last_used_preset_or_group({
            panel_provider,
            preset_name: selected.preset_name,
            group_name: group_name
          })
          const name_to_save = selected.preset_name
          const recents_key = get_recently_used_presets_or_groups_key(mode)
          const recents =
            context.globalState.get<string[]>(recents_key, []) ?? []
          const newRecents = [
            name_to_save,
            ...recents.filter((r) => r != name_to_save)
          ].slice(0, 10)
          context.globalState.update(recents_key, newRecents)
          do_resolve({ preset_names: [selected.preset_name] })
        }
      } else if (selected.group_name) {
        quick_pick.hide()
        const group_name = selected.group_name
        const default_presets_in_group: ConfigPresetFormat[] = []

        if (group_name == 'Ungrouped') {
          for (const preset of presets) {
            if (!preset.chatbot) break
            if (preset.isSelected) default_presets_in_group.push(preset)
          }
        } else {
          const group_index = presets.findIndex((p) => p.name == group_name)
          if (group_index != -1) {
            for (let i = group_index + 1; i < presets.length; i++) {
              const preset = presets[i]
              if (!preset.chatbot) break
              else if (preset.isSelected) default_presets_in_group.push(preset)
            }
          }
        }

        const runnable_presets = default_presets_in_group.filter(
          (preset) => !params.get_is_preset_disabled(preset)
        )
        const preset_names = runnable_presets
          .map((p) => p.name!)
          .filter(Boolean)

        if (preset_names.length > 0) {
          update_last_used_preset_or_group({ panel_provider, group_name })
          const recents_key = get_recently_used_presets_or_groups_key(mode)
          const recents =
            context.globalState.get<string[]>(recents_key, []) ?? []
          const newRecents = [
            group_name,
            ...recents.filter((r) => r !== group_name)
          ].slice(0, 10)
          context.globalState.update(recents_key, newRecents)
          do_resolve({ preset_names })
        }
      } else {
        quick_pick.hide()
        do_resolve({ preset_names: [] })
      }
    })

    quick_pick.onDidHide(() => {
      disposables.forEach((d) => d.dispose())
      quick_pick.dispose()
      do_resolve(null)
    })

    disposables.push(quick_pick)
    quick_pick.show()
  })
}

async function resolve_presets(params: {
  panel_provider: PanelProvider
  preset_name?: string
  group_name?: string
  show_quick_pick?: boolean
  context: vscode.ExtensionContext
}): Promise<{ preset_names: string[]; without_submission?: boolean }> {
  const last_selected_preset_or_group_key =
    get_last_selected_preset_or_group_key(params.panel_provider.web_prompt_type)
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = params.panel_provider.get_presets_config_key()
  const all_presets = config.get<ConfigPresetFormat[]>(presets_config_key, [])
  const is_in_code_completions_mode =
    params.panel_provider.web_prompt_type == 'code-completions'

  let current_instructions = ''
  if (is_in_code_completions_mode) {
    current_instructions = params.panel_provider.code_completion_instructions
  } else {
    if (params.panel_provider.web_prompt_type == 'ask') {
      current_instructions = params.panel_provider.ask_instructions
    } else if (params.panel_provider.web_prompt_type == 'edit-context') {
      current_instructions = params.panel_provider.edit_instructions
    } else if (params.panel_provider.web_prompt_type == 'no-context') {
      current_instructions = params.panel_provider.no_context_instructions
    }
  }

  const get_is_preset_disabled = (preset: ConfigPresetFormat) =>
    (preset.chatbot &&
      (!params.panel_provider.websocket_server_instance.is_connected_with_browser() ||
        (is_in_code_completions_mode &&
          (!params.panel_provider.has_active_editor ||
            params.panel_provider.has_active_selection)) ||
        (!is_in_code_completions_mode &&
          !(
            current_instructions ||
            preset.promptPrefix ||
            preset.promptSuffix
          )))) ||
    false

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
          vscode.window.showWarningMessage(
            dictionary.warning_message.TYPE_SOMETHING_TO_USE_PRESET
          )
        }
        return { preset_names: [] }
      }
      return { preset_names: [params.preset_name] }
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
    const preset_names = runnable_presets
      .map((preset) => preset.name)
      .filter((name): name is string => !!name)

    if (preset_names.length > 0) {
      if (preset_names.length < default_presets_in_group.length) {
        const disabled_presets = default_presets_in_group.filter(
          (p) => p.name && !preset_names.includes(p.name)
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
            dictionary.warning_message
              .PRESETS_NOT_RUN_DUE_TO_MISSING_INSTRUCTIONS
          )
        }
      }
      return { preset_names }
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
        vscode.window.showWarningMessage(
          dictionary.warning_message.TYPE_SOMETHING_TO_USE_GROUP
        )
        return { preset_names: [] }
      }
    }
    vscode.window.showWarningMessage(
      dictionary.warning_message.GROUP_HAS_NO_SELECTED_PRESETS
    )
    return { preset_names: [] }
  } else {
    // Both preset_name and group_name are undefined.
    // This indicates a generic "send" action, where we should
    // use the last selected preset/group or prompt the user.
    // It also handles cases where a specified preset/group was not found.
  }

  if (
    !params.show_quick_pick &&
    params.preset_name === undefined &&
    params.group_name === undefined
  ) {
    // Try to use last selection if "Send" button is clicked without specific preset/group
    const last_selected_name =
      params.context.workspaceState.get<string>(
        last_selected_preset_or_group_key
      ) ??
      params.context.globalState.get<string>(last_selected_preset_or_group_key)

    if (last_selected_name) {
      if (last_selected_name === 'Ungrouped') {
        const first_group_index = all_presets.findIndex((p) => !p.chatbot)
        const relevant_presets =
          first_group_index == -1
            ? all_presets
            : all_presets.slice(0, first_group_index)
        const preset_names = relevant_presets
          .filter((p) => p.isSelected && !get_is_preset_disabled(p))
          .map((p) => p.name)
          .filter((name): name is string => !!name)
        if (preset_names.length > 0) return { preset_names }
      } else {
        const item = all_presets.find((p) => p.name === last_selected_name)
        if (item) {
          if (item.chatbot) {
            // It's a preset
            if (get_is_preset_disabled(item)) {
              if (
                !is_in_code_completions_mode &&
                !current_instructions &&
                !item.promptPrefix &&
                !item.promptSuffix
              ) {
                vscode.window.showWarningMessage(
                  dictionary.warning_message.TYPE_SOMETHING_TO_USE_PRESET
                )
              }
              return { preset_names: [] }
            } else {
              return { preset_names: [last_selected_name] }
            }
          } else {
            // It's a group
            const group_index = all_presets.findIndex(
              (p) => p.name == last_selected_name
            )
            const preset_names: string[] = []
            if (group_index != -1) {
              for (let i = group_index + 1; i < all_presets.length; i++) {
                const preset = all_presets[i]
                if (!preset.chatbot) {
                  break // next group
                }
                if (
                  preset.isSelected &&
                  preset.name &&
                  !get_is_preset_disabled(preset)
                ) {
                  preset_names.push(preset.name)
                }
              }
            }
            if (preset_names.length > 0) return { preset_names }
          }
        }
      }
    }
  }

  const resolution = await show_preset_quick_pick({
    presets: all_presets,
    context: params.context,
    mode: params.panel_provider.web_prompt_type,
    panel_provider: params.panel_provider,
    get_is_preset_disabled,
    is_in_code_completions_mode,
    current_instructions
  })

  return resolution ?? { preset_names: [] }
}
