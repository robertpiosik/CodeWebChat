import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { OriginalFileState } from './types/original-file-state'
import { handle_restore_preview } from './handlers/restore-preview-handler'
import {
  parse_response,
  FileItem,
  DiffItem,
  RelevantFilesItem
} from './utils/clipboard-parser'
import { create_safe_path } from '@/utils/path-sanitizer'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { apply_git_patch } from './handlers/diff-handler'
import { apply_file_relocations } from './utils/file-operations'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { get_intelligent_update_config } from '@/utils/intelligent-update-utils'
import { PROVIDERS } from '@shared/constants/providers'
import { handle_active_editor_intelligent_update } from './handlers/active-editor-intelligent-update-handler'
import { handle_fast_replace } from './handlers/fast-replace-handler'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { FileInPreview } from '@shared/types/file-in-preview'
import { update_undo_button_state } from './utils/state-manager'
import { check_for_conflict_markers } from './utils/file-checks'
import { handle_conflict_markers } from './handlers/conflict-markers-handler'
import { handle_truncated_edit } from './handlers/truncated-handler'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { natural_sort } from '@/utils/natural-sort'
import { is_truncation_line } from './utils/edit-formats/truncations'

export type PreviewData = {
  original_states: OriginalFileState[]
  chat_response: string
}

export type CommandArgs = {
  response?: string
  raw_instructions?: string
  edit_format?: string
  original_editor_state?: {
    file_path: string
    position: { line: number; character: number }
  }
  files_with_content?: FileInPreview[]
  created_at?: number
  url?: string
}

export const process_chat_response = async (
  args: CommandArgs | undefined,
  chat_response: string,
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider,
  workspace_provider: WorkspaceProvider
): Promise<PreviewData | null> => {
  if (args?.files_with_content) {
    const result = await handle_restore_preview(args.files_with_content)
    if (result.success && result.original_states) {
      const augmented_states = result.original_states.map((state) => {
        const file_in_preview = args?.files_with_content!.find(
          (f) =>
            f.file_path === state.file_path &&
            f.workspace_name === state.workspace_name
        )
        return {
          ...state,
          ai_content:
            file_in_preview?.ai_content ??
            file_in_preview?.proposed_content ??
            file_in_preview?.content,
          proposed_content: file_in_preview?.proposed_content,
          is_checked: file_in_preview?.is_checked,
          apply_failed: file_in_preview?.apply_failed,
          applied_with_intelligent_update:
            file_in_preview?.applied_with_intelligent_update
        }
      })
      update_undo_button_state({
        context,
        panel_provider,
        states: augmented_states,
        applied_content: chat_response,
        original_editor_state: args?.original_editor_state
      })
      return {
        original_states: augmented_states,
        chat_response
      }
    }
    return null
  }

  const is_single_root_folder_workspace =
    vscode.workspace.workspaceFolders?.length == 1

  let clipboard_items = parse_response({
    response: chat_response,
    is_single_root_folder_workspace
  })

  console.log('xxx', clipboard_items)

  if (clipboard_items.some((item) => item.type == 'relevant-files')) {
    const relevant_files_item = clipboard_items.find(
      (item) => item.type == 'relevant-files'
    ) as RelevantFilesItem

    const current_checked_files = workspace_provider.get_checked_files()
    const relevant_paths_normalized = new Set(
      relevant_files_item.file_paths.map((p) => p.replace(/\\/g, '/'))
    )

    const quick_pick_items: {
      label: string
      picked: boolean
      description?: string
    }[] = relevant_files_item.file_paths.map((path) => ({
      label: path,
      picked: true
    }))

    for (const file_path of current_checked_files) {
      const workspace_root =
        workspace_provider.get_workspace_root_for_file(file_path)
      if (workspace_root) {
        const relative_path = path
          .relative(workspace_root, file_path)
          .replace(/\\/g, '/')
        if (!relevant_paths_normalized.has(relative_path)) {
          if (!quick_pick_items.some((item) => item.label == relative_path)) {
            quick_pick_items.push({
              label: relative_path,
              picked: false
            })
          }
        }
      }
    }

    quick_pick_items.sort((a, b) => natural_sort(a.label, b.label))

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = quick_pick_items
    quick_pick.selectedItems = quick_pick_items.filter((i) => i.picked)
    quick_pick.canSelectMany = true
    quick_pick.title = 'Context Pruning'
    quick_pick.placeholder = 'Confirm file selection'
    quick_pick.buttons = [
      { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
    ]

    const selected_items = await new Promise<
      readonly vscode.QuickPickItem[] | undefined
    >((resolve) => {
      let is_accepted = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton((button) => {
          if (button.tooltip == 'Close') {
            quick_pick.hide()
            resolve(undefined)
          }
        }),
        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(quick_pick.selectedItems)
          quick_pick.hide()
        }),
        quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve(undefined)
          }
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )
      quick_pick.show()
    })

    if (selected_items && selected_items.length > 0) {
      const workspace_roots = workspace_provider.get_workspace_roots()
      const files_to_check: string[] = []

      for (const selection of selected_items) {
        for (const root of workspace_roots) {
          const potential_path = path.join(root, selection.label)
          if (fs.existsSync(potential_path)) {
            files_to_check.push(potential_path)
            break
          }
        }
      }

      if (files_to_check.length > 0) {
        await workspace_provider.set_checked_files(files_to_check)
        vscode.window.showInformationMessage(`Context pruned successfully.`)
      }
    }

    return null
  } else if (clipboard_items.some((item) => item.type == 'diff')) {
    const patches = clipboard_items.filter(
      (item): item is DiffItem => item.type == 'diff'
    )
    const rename_map = new Map<string, string>()
    patches.forEach((patch) => {
      if (patch.new_file_path && patch.file_path) {
        rename_map.set(patch.file_path, patch.new_file_path)
      }
    })

    const set_new_paths_in_original_states = (states: OriginalFileState[]) => {
      if (!rename_map.size) return
      states.forEach((state) => {
        if (rename_map.has(state.file_path)) {
          state.new_file_path = rename_map.get(state.file_path)!
        }
      })
    }

    const workspace_map = new Map<string, string>()
    vscode.workspace.workspaceFolders!.forEach((folder) => {
      workspace_map.set(folder.name, folder.uri.fsPath)
    })

    const default_workspace = vscode.workspace.workspaceFolders![0].uri.fsPath

    let all_original_states: OriginalFileState[] = []
    const applied_patches: {
      patch: DiffItem
      original_states: OriginalFileState[]
      diff_application_method?: 'recount' | 'search_and_replace'
    }[] = []
    let any_patch_used_fallback = false

    const total_patches = patches.length

    for (let i = 0; i < total_patches; i++) {
      const patch = patches[i]
      let workspace_path = default_workspace

      if (patch.workspace_name && workspace_map.has(patch.workspace_name)) {
        workspace_path = workspace_map.get(patch.workspace_name)!
      }

      const result = await apply_git_patch(patch.content, workspace_path)

      if (result.success) {
        if (result.diff_application_method && result.original_states) {
          for (const state of result.original_states) {
            state.diff_application_method = result.diff_application_method
            state.ai_content = patch.content
          }
        }
        if (result.original_states) {
          all_original_states = all_original_states.concat(
            result.original_states
          )
          applied_patches.push({
            patch,
            original_states: result.original_states,
            diff_application_method: result.diff_application_method
          })
        }
        if (result.diff_application_method) {
          any_patch_used_fallback = true
        }
      } else {
        if (result.original_states) {
          for (const state of result.original_states) {
            state.apply_failed = true
            state.ai_content = patch.content
          }
          all_original_states = all_original_states.concat(
            result.original_states
          )
        }
      }
    }

    if (all_original_states.length > 0) {
      set_new_paths_in_original_states(all_original_states)
      await apply_file_relocations(all_original_states)
      update_undo_button_state({
        context,
        panel_provider,
        states: all_original_states,
        applied_content: chat_response,
        original_editor_state: args?.original_editor_state
      })
    }

    if (all_original_states.length > 0) {
      if (any_patch_used_fallback) {
        ;(async () => {
          const fallback_patches_count = applied_patches.filter(
            (p) => p.diff_application_method
          ).length
          const fallback_files = applied_patches
            .filter((p) => p.diff_application_method)
            .map((p) => p.patch.file_path)

          Logger.info({
            function_name: 'process_chat_response',
            message: 'Patches applied with fallback method',
            data: {
              count: fallback_patches_count,
              total: total_patches,
              files: fallback_files
            }
          })
        })()
      }
      return {
        original_states: all_original_states,
        chat_response
      }
    }

    return null
  } else {
    if (clipboard_items.some((item) => item.type == 'code-at-cursor')) {
      const completion = clipboard_items.find(
        (item) => item.type == 'code-at-cursor'
      )!
      const workspace_map = new Map<string, string>()
      vscode.workspace.workspaceFolders!.forEach((folder) => {
        workspace_map.set(folder.name, folder.uri.fsPath)
      })
      const default_workspace = vscode.workspace.workspaceFolders![0].uri.fsPath
      let workspace_root = default_workspace
      if (
        completion.workspace_name &&
        workspace_map.has(completion.workspace_name)
      ) {
        workspace_root = workspace_map.get(completion.workspace_name)!
      }
      const safe_path = create_safe_path(workspace_root, completion.file_path)
      if (!safe_path || !fs.existsSync(safe_path)) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FILE_NOT_FOUND(completion.file_path)
        )
        Logger.warn({
          function_name: 'process_chat_response',
          message: 'File not found for code completion.',
          data: { file_path: completion.file_path, safe_path }
        })
        return null
      }

      const document = await vscode.workspace.openTextDocument(safe_path)
      const original_content = document.getText()
      const line_index = completion.line - 1
      const char_index = completion.character - 1

      if (
        line_index < 0 ||
        char_index < 0 ||
        line_index >= document.lineCount ||
        char_index > document.lineAt(line_index).text.length
      ) {
        vscode.window.showErrorMessage(
          dictionary.error_message.INVALID_POSITION_FOR_CODE_COMPLETION(
            completion.file_path
          )
        )
        return null
      }

      const position_offset = document.offsetAt(
        new vscode.Position(line_index, char_index)
      )
      const new_content =
        original_content.slice(0, position_offset) +
        completion.content +
        original_content.slice(position_offset)

      if (!args) args = {}
      if (!args.original_editor_state) {
        args.original_editor_state = {
          file_path: safe_path,
          position: {
            line: line_index,
            character: char_index
          }
        }
      }

      clipboard_items = [
        {
          type: 'file',
          file_path: completion.file_path,
          content: new_content,
          workspace_name: completion.workspace_name
        }
      ]
    }

    const files = clipboard_items.filter(
      (item): item is FileItem => item.type == 'file'
    )
    if (files.length == 0) {
      const editor = vscode.window.activeTextEditor
      if (editor) {
        const choice = await vscode.window.showWarningMessage(
          'No valid code blocks found',
          {
            modal: true,
            detail: 'Apply the clipboard text to the active editor?'
          },
          'Apply with Intelligent Update'
        )

        if (choice == 'Apply with Intelligent Update') {
          const document = editor.document
          const file_path_for_block = vscode.workspace
            .asRelativePath(document.uri, !is_single_root_folder_workspace)
            .replace(/\\/g, '/')

          const fake_chat_response = `\`\`\`\n// ${file_path_for_block}\n${chat_response}\n\`\`\``

          const api_providers_manager = new ModelProvidersManager(context)
          const config_result = await get_intelligent_update_config(
            api_providers_manager,
            false,
            context
          )

          if (!config_result) {
            return null
          }

          const { provider, config: intelligent_update_config } = config_result

          let endpoint_url = ''
          if (provider.type == 'built-in') {
            const provider_info =
              PROVIDERS[provider.name as keyof typeof PROVIDERS]
            endpoint_url = provider_info.base_url
          } else {
            endpoint_url = provider.base_url
          }

          const intelligent_update_states =
            await handle_active_editor_intelligent_update({
              endpoint_url,
              api_key: provider.api_key,
              config: intelligent_update_config,
              chat_response: fake_chat_response,
              context: context,
              is_single_root_folder_workspace,
              panel_provider
            })

          if (intelligent_update_states) {
            update_undo_button_state({
              context,
              panel_provider,
              states: intelligent_update_states,
              applied_content: chat_response,
              original_editor_state: args?.original_editor_state
            })

            return {
              original_states: intelligent_update_states,
              chat_response
            }
          }
          return null
        }
      } else {
        vscode.window.showInformationMessage(
          dictionary.information_message.NO_ACTIVE_EDITOR_FOUND
        )
      }

      return null
    }

    let selected_mode_label:
      | 'Fast replace'
      | 'Conflict markers'
      | 'Truncated'
      | undefined = undefined

    const has_conflict_markers = check_for_conflict_markers(files)
    const has_truncation_markers = files.some((f) =>
      f.content.split('\n').some((line) => is_truncation_line(line))
    )

    if (has_conflict_markers) {
      selected_mode_label = 'Conflict markers'
      Logger.info({
        function_name: 'process_chat_response',
        message: 'Selecting conflict markers mode.'
      })
    } else if (has_truncation_markers) {
      selected_mode_label = 'Truncated'
      Logger.info({
        function_name: 'process_chat_response',
        message: 'Selecting truncated edit mode.'
      })
    } else {
      selected_mode_label = 'Fast replace'
    }

    let final_original_states: OriginalFileState[] | null = null
    let operation_success = false

    if (selected_mode_label == 'Fast replace') {
      const result = await handle_fast_replace(files)
      if (result.success && result.original_states) {
        final_original_states = result.original_states
        operation_success = true
      }
      Logger.info({
        function_name: 'process_chat_response',
        message: 'Fast replace handler finished.',
        data: { success: result.success }
      })
    } else if (selected_mode_label == 'Truncated') {
      const result = await handle_truncated_edit(files)
      const successful_states = result.original_states || []
      const failed_files = result.failed_files || []

      if (failed_files.length > 0) {
        const workspace_map = new Map<string, string>()
        vscode.workspace.workspaceFolders!.forEach((folder) => {
          workspace_map.set(folder.name, folder.uri.fsPath)
        })
        const default_workspace =
          vscode.workspace.workspaceFolders![0].uri.fsPath

        failed_files.forEach((file) => {
          successful_states.push(
            create_failed_file_state(file, default_workspace, workspace_map)
          )
        })
      }

      if (successful_states.length > 0) {
        final_original_states = successful_states
        operation_success = true
      }
      Logger.info({
        function_name: 'process_chat_response',
        message: 'Truncated handler finished.',
        data: { success: result.success }
      })
    } else if (selected_mode_label == 'Conflict markers') {
      const result = await handle_conflict_markers(files)

      const successful_states = result.original_states || []
      const failed_files: FileItem[] = result.failed_files || []

      if (failed_files.length > 0) {
        const workspace_map = new Map<string, string>()
        vscode.workspace.workspaceFolders!.forEach((folder) => {
          workspace_map.set(folder.name, folder.uri.fsPath)
        })
        const default_workspace =
          vscode.workspace.workspaceFolders![0].uri.fsPath

        failed_files.forEach((file) => {
          successful_states.push(
            create_failed_file_state(file, default_workspace, workspace_map)
          )
        })
      }

      if (successful_states.length > 0) {
        final_original_states = successful_states
        operation_success = true
      }
      Logger.info({
        function_name: 'process_chat_response',
        message: 'Conflict markers handler finished.',
        data: { success: result.success }
      })
    } else {
      Logger.error({
        function_name: 'process_chat_response',
        message: 'No valid mode selected or determined.'
      })
      return null
    }

    if (operation_success && final_original_states) {
      update_undo_button_state({
        context,
        panel_provider,
        states: final_original_states,
        applied_content: chat_response,
        original_editor_state: args?.original_editor_state
      })

      return {
        original_states: final_original_states,
        chat_response
      }
    } else {
      update_undo_button_state({ context, panel_provider, states: null })
      Logger.info({
        function_name: 'process_chat_response',
        message: 'Operation concluded without success.'
      })
    }

    Logger.info({
      function_name: 'process_chat_response',
      message: 'end',
      data: {
        mode: selected_mode_label,
        success: operation_success
      }
    })
    return null
  }
}

const create_failed_file_state = (
  file: FileItem,
  default_workspace: string,
  workspace_map: Map<string, string>
): OriginalFileState => {
  let workspace_root = default_workspace
  if (file.workspace_name && workspace_map.has(file.workspace_name)) {
    workspace_root = workspace_map.get(file.workspace_name)!
  }
  const safe_path = create_safe_path(workspace_root, file.file_path)
  let content = ''

  if (safe_path && fs.existsSync(safe_path)) {
    try {
      content = fs.readFileSync(safe_path, 'utf8')
    } catch (e) {}
  }

  return {
    file_path: file.file_path,
    workspace_name: file.workspace_name,
    content,
    apply_failed: true,
    ai_content: file.content
  }
}
