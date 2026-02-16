import { PanelProvider } from '@/views/panel/backend/panel-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_symbol } from '@/views/panel/backend/utils/replace-selection-symbol'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { replace_saved_context_symbol } from '@/views/panel/backend/utils/replace-saved-context-symbol'
import {
  replace_changes_symbol,
  replace_context_at_commit_symbol,
  replace_commit_symbol
} from '@/views/panel/backend/utils/replace-git-symbols'
import { replace_skill_symbol } from '@/views/panel/backend/utils/replace-skill-symbol'
import { replace_image_symbol } from '@/views/panel/backend/utils/replace-image-symbol'
import { replace_document_symbol } from '../utils/replace-document-symbol'
import {
  code_at_cursor_instructions_for_panel,
  prune_context_instructions_prefix,
  prune_context_format
} from '@/constants/instructions'
import { get_recently_used_presets_or_groups_key } from '@/constants/state-keys'
import { ConfigPresetFormat } from '../utils/preset-format-converters'
import { MODE } from '@/views/panel/types/main-view-mode'
import { WebPromptType } from '@shared/types/prompt-types'
import { CHATBOTS } from '@shared/constants/chatbots'
import { update_last_used_preset_or_group } from './update-last-used-preset-or-group'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'

export const handle_send_to_browser = async (params: {
  panel_provider: PanelProvider
  preset_name?: string
  group_name?: string
  show_quick_pick?: boolean
  invocation_count: number
}): Promise<void> => {
  if (
    params.panel_provider.mode == MODE.WEB &&
    !params.panel_provider.websocket_server_instance.is_connected_with_browser()
  ) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.BROWSER_EXTENSION_NOT_CONNECTED
    )
    return
  }

  const is_in_code_completions_mode =
    params.panel_provider.web_prompt_type == 'code-at-cursor'
  const current_instructions = params.panel_provider.current_instruction

  const active_editor = vscode.window.activeTextEditor

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
    update_last_used_preset_or_group({
      panel_provider: params.panel_provider,
      preset_name: params.preset_name,
      group_name: params.group_name
    })
  }

  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector({
    workspace_provider: params.panel_provider.workspace_provider,
    open_editors_provider: params.panel_provider.open_editors_provider
  })

  let sent = false

  if (is_in_code_completions_mode) {
    const document = active_editor!.document
    const position = active_editor!.selection.active

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )
    let processed_completion_instructions = current_instructions
    let skill_definitions = ''

    if (processed_completion_instructions.includes('#Selection')) {
      processed_completion_instructions = replace_selection_symbol(
        processed_completion_instructions
      )
    }

    if (processed_completion_instructions.includes('#Changes(')) {
      const result = await replace_changes_symbol({
        instruction: processed_completion_instructions
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.changes_definitions
    }

    if (processed_completion_instructions.includes('#Commit(')) {
      const result = await replace_commit_symbol({
        instruction: processed_completion_instructions
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.commit_definitions
    }

    if (processed_completion_instructions.includes('#ContextAtCommit(')) {
      processed_completion_instructions =
        await replace_context_at_commit_symbol({
          instruction: processed_completion_instructions,
          workspace_provider: params.panel_provider.workspace_provider
        })
    }

    if (processed_completion_instructions.includes('#SavedContext(')) {
      const result = await replace_saved_context_symbol({
        instruction: processed_completion_instructions,
        context: params.panel_provider.context,
        workspace_provider: params.panel_provider.workspace_provider
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.context_definitions
    }

    if (processed_completion_instructions.includes('#Skill(')) {
      const result = await replace_skill_symbol({
        instruction: processed_completion_instructions
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.skill_definitions
    }

    if (processed_completion_instructions.includes('#Image(')) {
      processed_completion_instructions = await replace_image_symbol({
        instruction: processed_completion_instructions,
        remove: true
      })
    }

    if (processed_completion_instructions.includes('#Document(')) {
      processed_completion_instructions = await replace_document_symbol({
        instruction: processed_completion_instructions
      })
    }

    const context_text = await files_collector.collect_files()

    const relative_path = vscode.workspace.asRelativePath(document.uri)

    const main_instructions = code_at_cursor_instructions_for_panel({
      file_path: relative_path,
      row: position.line,
      column: position.character
    })

    const payload = {
      before: `<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const text = `${payload.before}${
      processed_completion_instructions
        ? `<missing_text>${processed_completion_instructions}</missing_text>`
        : '<missing_text>'
    }${payload.after}\n${skill_definitions}${main_instructions}`

    const chats = resolved_preset_names.flatMap((preset_name) => {
      return Array.from({ length: params.invocation_count }).map(() => ({
        text,
        preset_name,
        raw_instructions: processed_completion_instructions,
        prompt_type: params.panel_provider.web_prompt_type
      }))
    })

    sent =
      await params.panel_provider.websocket_server_instance.initialize_chats({
        chats,
        presets_config_key: params.panel_provider.get_presets_config_key()
      })
  } else {
    const editor = vscode.window.activeTextEditor
    const additional_paths: string[] = []

    const context_text = await files_collector.collect_files({
      additional_paths,
      no_context: params.panel_provider.web_prompt_type == 'no-context',
      compact: params.panel_provider.web_prompt_type == 'prune-context'
    })

    const prepared_chats = await Promise.all(
      resolved_preset_names.map(async (preset_name) => {
        let instructions = apply_preset_affixes_to_instruction({
          instruction: current_instructions,
          preset_name: preset_name,
          presets_config_key: params.panel_provider.get_presets_config_key()
        })

        if (editor && !editor.selection.isEmpty) {
          if (instructions.includes('#Selection')) {
            instructions = replace_selection_symbol(instructions)
          }
        }

        let processed_instructions = instructions
        let skill_definitions = ''
        if (processed_instructions.includes('#Changes(')) {
          const result = await replace_changes_symbol({
            instruction: processed_instructions
          })
          processed_instructions = result.instruction
          skill_definitions += result.changes_definitions
        }

        if (processed_instructions.includes('#Commit(')) {
          const result = await replace_commit_symbol({
            instruction: processed_instructions
          })
          processed_instructions = result.instruction
          skill_definitions += result.commit_definitions
        }

        if (processed_instructions.includes('#ContextAtCommit(')) {
          processed_instructions = await replace_context_at_commit_symbol({
            instruction: processed_instructions,
            workspace_provider: params.panel_provider.workspace_provider
          })
        }
        if (processed_instructions.includes('#SavedContext(')) {
          const result = await replace_saved_context_symbol({
            instruction: processed_instructions,
            context: params.panel_provider.context,
            workspace_provider: params.panel_provider.workspace_provider
          })
          processed_instructions = result.instruction
          skill_definitions += result.context_definitions
        }

        if (processed_instructions.includes('#Skill(')) {
          const result = await replace_skill_symbol({
            instruction: processed_instructions
          })
          processed_instructions = result.instruction
          skill_definitions += result.skill_definitions
        }

        if (processed_instructions.includes('#Image(')) {
          processed_instructions = await replace_image_symbol({
            instruction: processed_instructions,
            remove: true
          })
        }

        if (processed_instructions.includes('#Document(')) {
          processed_instructions = await replace_document_symbol({
            instruction: processed_instructions
          })
        }

        let system_instructions_xml = ''
        if (params.panel_provider.web_prompt_type == 'edit-context') {
          const config = vscode.workspace.getConfiguration('codeWebChat')
          const instructions_key = {
            whole: 'editFormatInstructionsWhole',
            truncated: 'editFormatInstructionsTruncated',
            'before-after': 'editFormatInstructionsBeforeAfter',
            diff: 'editFormatInstructionsDiff'
          }[params.panel_provider.chat_edit_format]
          const default_instructions = {
            whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
            truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
            'before-after': EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
            diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
          }[params.panel_provider.chat_edit_format]
          const edit_format_instructions =
            config.get<string>(instructions_key) || default_instructions
          if (edit_format_instructions) {
            system_instructions_xml = `<system>\n${edit_format_instructions}\n</system>`
          }
        } else if (params.panel_provider.web_prompt_type == 'prune-context') {
          const config = vscode.workspace.getConfiguration('codeWebChat')
          const config_prune_instructions_prefix = config.get<string>(
            'pruneContextInstructionsPrefix'
          )
          const instructions_to_use =
            config_prune_instructions_prefix ||
            prune_context_instructions_prefix
          system_instructions_xml = `${instructions_to_use}\n${prune_context_format}`
        }

        return {
          text: context_text
            ? `<files>\n${context_text}</files>\n${skill_definitions}${
                system_instructions_xml ? system_instructions_xml + '\n' : ''
              }${processed_instructions}`
            : `${
                system_instructions_xml ? system_instructions_xml + '\n' : ''
              }${skill_definitions}${processed_instructions}`,
          preset_name,
          raw_instructions: current_instructions,
          prompt_type: params.panel_provider.web_prompt_type,
          edit_format:
            params.panel_provider.web_prompt_type == 'edit-context'
              ? params.panel_provider.chat_edit_format
              : undefined
        }
      })
    )

    const chats = prepared_chats.flatMap((chat) =>
      Array.from({ length: params.invocation_count }).map(() => ({ ...chat }))
    )

    sent =
      await params.panel_provider.websocket_server_instance.initialize_chats({
        chats,
        presets_config_key: params.panel_provider.get_presets_config_key()
      })
  }

  if (sent) {
    params.panel_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Opened in the connected browser',
      type: 'success'
    })
  }

  if (!params.preset_name && !params.group_name) {
    params.panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
  }
}

async function show_preset_quick_pick(params: {
  presets: ConfigPresetFormat[]
  context: vscode.ExtensionContext
  prompt_type: WebPromptType
  panel_provider: PanelProvider
  get_is_preset_disabled: (preset: ConfigPresetFormat) => boolean
  is_in_code_completions_mode: boolean
  current_instructions: string
}): Promise<{ preset_names: string[] } | null> {
  const { presets, context, prompt_type, panel_provider } = params

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { preset_name?: string; group_name?: string }
  >()

  const recents_key = get_recently_used_presets_or_groups_key(prompt_type)
  const recent_names =
    context.workspaceState.get<string[]>(recents_key) ??
    context.globalState.get<string[]>(recents_key) ??
    []

  if (recent_names.length == 0) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.NO_RECENTLY_USED_PRESETS_OR_GROUPS
    )
    return null
  }

  const items = recent_names
    .map((name) => {
      const item = presets.find((p) => p.name == name)

      if (item && !item.chatbot) {
        return {
          label: name.replace(/\s*\(\d+\)$/, ''),
          group_name: name,
          description: 'Group'
        }
      }

      if (item && item.chatbot) {
        const preset = item
        const is_unnamed = !preset.name || /^\(\d+\)$/.test(preset.name.trim())
        const chatbot_models =
          CHATBOTS[preset.chatbot as keyof typeof CHATBOTS]?.models
        const model = preset.model
          ? chatbot_models?.[preset.model]?.label || preset.model
          : ''
        return {
          label: `${
            is_unnamed
              ? preset.chatbot!
              : preset.name!.replace(/\s*\(\d+\)$/, '')
          }`,
          preset_name: preset.name,
          description: is_unnamed
            ? model
            : `${preset.chatbot}${model ? ` · ${model}` : ''}`
        }
      }
      return null
    })
    .filter((i): i is NonNullable<typeof i> => i !== null)

  quick_pick.items = items
  if (items.length == 0) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.NO_RECENTLY_USED_PRESETS_OR_GROUPS
    )
    return null
  }
  quick_pick.placeholder = 'Search recently used presets and groups'
  quick_pick.title = 'Recently Used Presets and Groups'
  quick_pick.matchOnDescription = true

  const last_selected_name = recent_names[0]

  let last_selected_preset_name: string | undefined
  if (last_selected_name) {
    const item = presets.find((p) => p.name == last_selected_name)
    if (item && item.chatbot) last_selected_preset_name = last_selected_name
  }

  if (last_selected_preset_name) {
    const last_item = quick_pick.items.find(
      (item) => item.preset_name == last_selected_preset_name
    )
    if (last_item) quick_pick.activeItems = [last_item]
  }

  return new Promise<{ preset_names: string[] } | null>((resolve) => {
    const disposables: vscode.Disposable[] = []
    let resolved = false
    const do_resolve = (value: { preset_names: string[] } | null) => {
      if (resolved) return
      resolved = true
      resolve(value)
    }

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
          let group_name: string | undefined
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
          do_resolve({ preset_names: [selected.preset_name] })
        }
      } else if (selected.group_name) {
        quick_pick.hide()
        const group_name = selected.group_name
        const default_presets_in_group: ConfigPresetFormat[] = []

        const group_index = presets.findIndex((p) => p.name == group_name)
        if (group_index != -1) {
          for (let i = group_index + 1; i < presets.length; i++) {
            const preset = presets[i]
            if (!preset.chatbot) break
            else if (preset.isSelected) default_presets_in_group.push(preset)
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
      if (!resolved) {
        panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
        do_resolve(null)
      }
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
}): Promise<{ preset_names: string[] }> {
  const recents_key = get_recently_used_presets_or_groups_key(
    params.panel_provider.web_prompt_type
  )
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = params.panel_provider.get_presets_config_key()
  const all_presets = config.get<ConfigPresetFormat[]>(presets_config_key, [])
  const is_in_code_completions_mode =
    params.panel_provider.web_prompt_type == 'code-at-cursor'

  let current_instructions = ''
  if (params.panel_provider.web_prompt_type == 'code-at-cursor') {
    current_instructions =
      params.panel_provider.code_at_cursor_instructions.instructions[
        params.panel_provider.code_at_cursor_instructions.active_index
      ] || ''
  } else if (params.panel_provider.web_prompt_type == 'ask-about-context') {
    current_instructions =
      params.panel_provider.ask_about_context_instructions.instructions[
        params.panel_provider.ask_about_context_instructions.active_index
      ] || ''
  } else if (params.panel_provider.web_prompt_type == 'edit-context') {
    current_instructions =
      params.panel_provider.edit_context_instructions.instructions[
        params.panel_provider.edit_context_instructions.active_index
      ] || ''
  } else if (params.panel_provider.web_prompt_type == 'no-context') {
    current_instructions =
      params.panel_provider.no_context_instructions.instructions[
        params.panel_provider.no_context_instructions.active_index
      ] || ''
  } else if (params.panel_provider.web_prompt_type == 'prune-context') {
    current_instructions =
      params.panel_provider.prune_context_instructions.instructions[
        params.panel_provider.prune_context_instructions.active_index
      ] || ''
  }

  const get_is_preset_disabled = (preset: ConfigPresetFormat) =>
    (preset.chatbot &&
      (!params.panel_provider.websocket_server_instance.is_connected_with_browser() ||
        (is_in_code_completions_mode &&
          (!params.panel_provider.currently_open_file_path ||
            !!params.panel_provider.current_selection)) ||
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
    const recents =
      params.context.workspaceState.get<string[]>(recents_key) ??
      params.context.globalState.get<string[]>(recents_key) ??
      []
    const last_selected_name = recents[0]
    if (last_selected_name) {
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

  const resolution = await show_preset_quick_pick({
    presets: all_presets,
    context: params.context,
    prompt_type: params.panel_provider.web_prompt_type,
    panel_provider: params.panel_provider,
    get_is_preset_disabled,
    is_in_code_completions_mode,
    current_instructions
  })

  return resolution ?? { preset_names: [] }
}
