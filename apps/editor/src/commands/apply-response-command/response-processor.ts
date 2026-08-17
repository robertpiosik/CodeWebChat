import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { OriginalFileState } from './types/original-file-state'
import { RecentApiConfiguration } from '@shared/types/response-history-item'
import { handle_restore_preview } from './handlers/restore-preview-handler'
import {
  FileItem,
  DiffItem,
  RelevantFilesItem,
  ResponseItem
} from './utils/response-parser'
import { create_safe_path } from '@/utils/path-sanitizer'
import { Logger } from '@shared/utils/logger'
import {
  apply_git_patch,
  sanitize_patch_content
} from './handlers/diff-handler'
import { apply_file_relocations } from './utils/file-operations'
import { handle_fast_replace } from './handlers/fast-replace-handler'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { FileInPreview } from '@shared/types/file-in-preview'
import { update_undo_button_state } from './utils/state-manager'
import { check_for_conflict_markers } from './utils/file-checks'
import { handle_search_replace } from './handlers/search-replace-handler'
import { handle_truncated_edit } from './handlers/truncated-handler'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { natural_sort } from '@/utils/natural-sort'
import { t } from '@/i18n'
import { is_truncation_line } from '@/utils/changes-integration/truncations-processor/utils/is-truncation-line'
import { prompt_for_merge_or_replace } from '@/features/search-files/utils/prompt-for-merge-or-replace'
import { search_files } from '@/features/search-files'
import { prompt_for_provided_results } from '@/features/search-files/utils/prompt-for-provided-results'
import { WebSocketManager } from '@/services/websocket-manager'

export type PreviewData = {
  original_states: OriginalFileState[]
  response: string
}

export type ApplyResponseCommandArgs = {
  response?: string
  raw_instructions?: string
  original_editor_state?: {
    file_path: string
    position: { line: number; character: number }
  }
  files_with_content?: FileInPreview[]
  created_at?: number
  url?: string
  recent_api_configuration?: RecentApiConfiguration
}

export const process_response = async (params: {
  args: ApplyResponseCommandArgs | undefined
  response: string
  response_items: ResponseItem[]
  extension_context: vscode.ExtensionContext
  prompt_view_provider: PromptViewProvider
  workspace_provider: WorkspaceProvider
  websocket_manager: WebSocketManager
}): Promise<PreviewData | null> => {
  const on_progress = (progress: number) => {
    params.prompt_view_provider.send_message({
      command: 'SHOW_PROGRESS',
      title: t('common.progress.preparing-preview'),
      progress
    })
  }

  if (params.args?.files_with_content) {
    const files = params.args.files_with_content.filter(
      (f) => f.type === 'file'
    ) as FileInPreview[]
    if (files.length > 0) {
      const result = await handle_restore_preview(files)
      if (result.success && result.original_states) {
        const augmented_states = result.original_states.map((state) => {
          const file_in_preview = files.find(
            (f) =>
              f.file_path === state.file_path &&
              f.workspace_name === state.workspace_name
          )
          return {
            ...state,
            ai_content: file_in_preview?.ai_content,
            proposed_content:
              file_in_preview?.proposed_content ?? file_in_preview?.content,
            current_content: file_in_preview?.content,
            is_checked: file_in_preview?.is_checked,
            apply_failed: file_in_preview?.apply_failed,
            applied_with_intelligent_update:
              file_in_preview?.applied_with_intelligent_update
          }
        })
        update_undo_button_state({
          extension_context: params.extension_context,
          prompt_view_provider: params.prompt_view_provider,
          states: augmented_states,
          applied_content: params.response,
          original_editor_state: params.args?.original_editor_state
        })
        return {
          original_states: augmented_states,
          response: params.response
        }
      }
      return null
    }
  }

  if (params.response_items.some((item) => item.type == 'relevant-files')) {
    const shared_context_state =
      params.prompt_view_provider.shared_context_state

    const current_checked_files = shared_context_state.get_checked_files()

    const workspace_roots = params.workspace_provider.get_workspace_roots()

    const files_for_preview: {
      file_path: string
      absolute_path: string
      is_checked: boolean
    }[] = []

    for (const item of params.response_items) {
      if (item.type == 'relevant-files') {
        const relevant_files_item = item as RelevantFilesItem
        const all_paths_to_process = new Set<string>(
          relevant_files_item.file_paths
        )

        const local_files: {
          file_path: string
          absolute_path: string
          is_checked: boolean
        }[] = []

        const is_multi_root = workspace_roots.length > 1

        for (const rel_path of Array.from(all_paths_to_process)) {
          let absolute_path: string | undefined
          let matched_workspace_root: string | undefined

          for (const root of workspace_roots) {
            let potential_rel_path = rel_path

            if (is_multi_root) {
              const workspace_name =
                params.workspace_provider.get_workspace_name(root)
              const prefix = `${workspace_name}/`
              if (rel_path.startsWith(prefix)) {
                potential_rel_path = rel_path.substring(prefix.length)
              }
            }

            const potential = path.join(root, potential_rel_path)
            if (fs.existsSync(potential)) {
              absolute_path = potential
              matched_workspace_root = root
              break
            }
          }

          if (absolute_path && matched_workspace_root) {
            const is_checked = current_checked_files.includes(absolute_path)

            local_files.push({
              file_path: rel_path,
              absolute_path: absolute_path,
              is_checked
            })
          }
        }

        local_files.sort((a, b) => natural_sort(a.file_path, b.file_path))
        files_for_preview.push(...local_files)
      }
    }

    params.prompt_view_provider.send_message({
      command: 'HIDE_PROGRESS'
    })

    let decision:
      | { selected_paths: string[]; matched_paths: string[]; title?: string }
      | undefined = undefined

    const files_to_prompt = files_for_preview.map((f) => ({
      path: f.absolute_path,
      checked: f.is_checked
    }))

    while (true) {
      const result = await prompt_for_provided_results({
        files: files_to_prompt,
        workspace_provider: params.workspace_provider
      })

      if (!result) {
        break
      }

      if ('action' in result) {
        const sub_search_result = await search_files({
          get_files: async () => result.matched_paths,
          workspace_provider: params.workspace_provider,
          extension_context: params.extension_context,
          websocket_manager: params.websocket_manager,
          show_back_button: true,
          is_sub_search: true
        })

        if (sub_search_result === 'back') {
          continue
        }

        decision = sub_search_result
        break
      }

      decision = result
      break
    }

    if (decision) {
      console.log('decision', decision)
      const selected_files = decision.selected_paths
      const presented_files = decision.matched_paths

      let paths_to_apply: string[] = []

      if (current_checked_files.length > 0) {
        const action = await prompt_for_merge_or_replace({
          extension_context: params.extension_context,
          title: decision.title
        })

        if (!action) return null

        if (action === 'merge') {
          const filtered_current_files = current_checked_files.filter(
            (f) => !presented_files.includes(f)
          )

          paths_to_apply = Array.from(
            new Set([...filtered_current_files, ...selected_files])
          )
        } else {
          paths_to_apply = selected_files
        }
      } else {
        paths_to_apply = selected_files
      }

      await params.workspace_provider.set_checked_files(paths_to_apply)

      vscode.window.showInformationMessage(t('common.success.context-updated'))
    }

    return null
  } else if (params.response_items.some((item) => item.type == 'diff')) {
    const patches = params.response_items.filter(
      (item): item is DiffItem => item.type == 'diff'
    )
    const rename_map = new Map<
      string,
      { new_path: string; new_workspace?: string }
    >()
    patches.forEach((patch) => {
      if (patch.new_file_path && patch.file_path) {
        const key = `${patch.workspace_name || ''}:${patch.file_path}`
        rename_map.set(key, {
          new_path: patch.new_file_path,
          new_workspace: patch.new_workspace_name || patch.workspace_name
        })
      }
    })

    const set_new_paths_in_original_states = (
      states: OriginalFileState[]
    ): OriginalFileState[] => {
      if (!rename_map.size) return states
      states.forEach((state) => {
        const key = `${state.workspace_name || ''}:${state.file_path}`
        if (rename_map.has(key)) {
          const rename_info = rename_map.get(key)!
          state.new_file_path = rename_info.new_path
          state.new_workspace_name = rename_info.new_workspace
        }
      })

      const target_paths = new Set<string>()
      rename_map.forEach((val) => {
        target_paths.add(`${val.new_workspace || ''}:${val.new_path}`)
      })

      return states.filter((state) => {
        if (state.file_state == 'new') {
          const key = `${state.workspace_name || ''}:${state.file_path}`
          if (target_paths.has(key)) {
            return false
          }
        }
        return true
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

    const total_patches = patches.length

    for (let i = 0; i < total_patches; i++) {
      on_progress(Math.round((i / total_patches) * 100))
      const patch = patches[i]
      let workspace_path = default_workspace

      if (patch.workspace_name && workspace_map.has(patch.workspace_name)) {
        workspace_path = workspace_map.get(patch.workspace_name)!
      }

      const sanitized_patch_content = sanitize_patch_content(
        patch.content,
        patch.workspace_name
      )
      const result = await apply_git_patch(
        sanitized_patch_content,
        workspace_path,
        patch.workspace_name,
        patch
      )

      if (result.success) {
        if (result.diff_application_method && result.original_states) {
          for (const state of result.original_states) {
            state.diff_application_method = result.diff_application_method
            state.ai_content = sanitized_patch_content
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
      } else {
        if (result.original_states) {
          for (const state of result.original_states) {
            state.apply_failed = true
            state.ai_content = sanitized_patch_content
          }
          all_original_states = all_original_states.concat(
            result.original_states
          )
        }
      }
    }

    if (all_original_states.length > 0) {
      all_original_states =
        set_new_paths_in_original_states(all_original_states)
      await apply_file_relocations(all_original_states)
      update_undo_button_state({
        extension_context: params.extension_context,
        prompt_view_provider: params.prompt_view_provider,
        states: all_original_states,
        applied_content: params.response,
        original_editor_state: params.args?.original_editor_state
      })
    }

    if (all_original_states.length > 0) {
      return {
        original_states: all_original_states,
        response: params.response
      }
    }

    return null
  } else {
    if (params.response_items.some((item) => item.type == 'code-at-cursor')) {
      const completion = params.response_items.find(
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
          t('command.apply-response.error.file-not-found', {
            path: completion.file_path
          })
        )
        Logger.warn({
          function_name: 'process_response',
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
          t('command.apply-response.error.invalid-position', {
            path: completion.file_path
          })
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

      if (!params.args) params.args = {}
      if (!params.args.original_editor_state) {
        params.args.original_editor_state = {
          file_path: safe_path,
          position: {
            line: line_index,
            character: char_index
          }
        }
      }

      params.response_items = [
        {
          type: 'file',
          file_path: completion.file_path,
          content: new_content,
          workspace_name: completion.workspace_name
        }
      ]
    }

    const files = params.response_items.filter(
      (item): item is FileItem => item.type == 'file'
    )

    if (files.length == 0) {
      vscode.window.showErrorMessage(
        t('command.apply-response.error.no-valid-response')
      )
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
        function_name: 'process_response',
        message: 'Selecting conflict markers mode.'
      })
    } else if (has_truncation_markers) {
      selected_mode_label = 'Truncated'
      Logger.info({
        function_name: 'process_response',
        message: 'Selecting truncated edit mode.'
      })
    } else {
      selected_mode_label = 'Fast replace'
    }

    let final_original_states: OriginalFileState[] | null = null
    let operation_success = false

    if (selected_mode_label == 'Fast replace') {
      const result = await handle_fast_replace({ files, on_progress })
      if (result.success && result.original_states) {
        final_original_states = result.original_states
        operation_success = true
      }
      Logger.info({
        function_name: 'process_response',
        message: 'Fast replace handler finished.',
        data: { success: result.success }
      })
    } else if (selected_mode_label == 'Truncated') {
      const result = await handle_truncated_edit({ files, on_progress })
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
            create_failed_file_state({
              file,
              default_workspace,
              workspace_map
            })
          )
        })
      }

      if (successful_states.length > 0) {
        final_original_states = successful_states
        operation_success = true
      }
      Logger.info({
        function_name: 'process_response',
        message: 'Truncated handler finished.',
        data: { success: result.success }
      })
    } else if (selected_mode_label == 'Conflict markers') {
      const result = await handle_search_replace({ files, on_progress })

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
            create_failed_file_state({
              file,
              default_workspace,
              workspace_map
            })
          )
        })
      }

      if (successful_states.length > 0) {
        final_original_states = successful_states
        operation_success = true
      }
      Logger.info({
        function_name: 'process_response',
        message: 'Conflict markers handler finished.',
        data: { success: result.success }
      })
    } else {
      Logger.error({
        function_name: 'process_response',
        message: 'No valid mode selected or determined.'
      })
      return null
    }

    if (operation_success && final_original_states) {
      update_undo_button_state({
        extension_context: params.extension_context,
        prompt_view_provider: params.prompt_view_provider,
        states: final_original_states,
        applied_content: params.response,
        original_editor_state: params.args?.original_editor_state
      })

      return {
        original_states: final_original_states,
        response: params.response
      }
    } else {
      update_undo_button_state({
        extension_context: params.extension_context,
        prompt_view_provider: params.prompt_view_provider,
        states: null
      })
      Logger.info({
        function_name: 'process_response',
        message: 'Operation concluded without success.'
      })
    }

    Logger.info({
      function_name: 'process_response',
      message: 'end',
      data: {
        mode: selected_mode_label,
        success: operation_success
      }
    })
    return null
  }
}

const create_failed_file_state = (params: {
  file: FileItem
  default_workspace: string
  workspace_map: Map<string, string>
}): OriginalFileState => {
  let workspace_root = params.default_workspace
  if (
    params.file.workspace_name &&
    params.workspace_map.has(params.file.workspace_name)
  ) {
    workspace_root = params.workspace_map.get(params.file.workspace_name)!
  }
  const safe_path = create_safe_path(workspace_root, params.file.file_path)
  let content = ''

  if (safe_path && fs.existsSync(safe_path)) {
    try {
      content = fs.readFileSync(safe_path, 'utf8')
    } catch (e) {}
  }

  return {
    file_path: params.file.file_path,
    workspace_name: params.file.workspace_name,
    content,
    apply_failed: true,
    ai_content: params.file.content
  }
}
