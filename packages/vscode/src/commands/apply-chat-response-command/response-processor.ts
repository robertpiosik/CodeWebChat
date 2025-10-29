import * as vscode from 'vscode'
import * as fs from 'fs'
import { OriginalFileState } from './types/original-file-state'
import { handle_restore_review } from './handlers/restore-review-handler'
import { parse_response } from './utils/clipboard-parser'
import { create_safe_path } from '@/utils/path-sanitizer'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { Diff } from './utils/clipboard-parser/extract-diff-patches'
import { apply_git_patch } from './handlers/diff-handler'
import { apply_file_relocations, undo_files } from './utils/file-operations'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { get_intelligent_update_config } from './utils/config-picker'
import { PROVIDERS } from '@shared/constants/providers'
import { handle_intelligent_update } from './handlers/intelligent-update-handler'
import { check_for_truncated_fragments } from '@/utils/check-for-truncated-fragments'
import { handle_fast_replace } from './handlers/fast-replace-handler'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { FileInReview } from '@shared/types/file-in-review'
import { update_undo_button_state } from './utils/state-manager'
import { check_if_all_files_new } from './utils/file-checks'

export type ReviewData = {
  original_states: OriginalFileState[]
  chat_response: string
}

export type CommandArgs = {
  response?: string
  raw_instructions?: string
  edit_format?: string
  suppress_fast_replace_inaccuracies_dialog?: boolean
  original_editor_state?: {
    file_path: string
    position: { line: number; character: number }
  }
  files_with_content?: FileInReview[]
}

export const process_chat_response = async (
  args: CommandArgs | undefined,
  chat_response: string,
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider
): Promise<ReviewData | null> => {
  if (args?.files_with_content) {
    const result = await handle_restore_review(args.files_with_content)
    if (result.success && result.original_states) {
      update_undo_button_state({
        context,
        panel_provider,
        states: result.original_states,
        applied_content: chat_response,
        original_editor_state: args?.original_editor_state
      })
      return {
        original_states: result.original_states,
        chat_response
      }
    }
    return null
  }

  const is_single_root_folder_workspace =
    vscode.workspace.workspaceFolders?.length == 1

  let clipboard_content = parse_response({
    response: chat_response,
    is_single_root_folder_workspace
  })

  if (
    clipboard_content.type == 'code-completion' &&
    clipboard_content.code_completion
  ) {
    const completion = clipboard_content.code_completion
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
    args.suppress_fast_replace_inaccuracies_dialog = true

    clipboard_content = {
      type: 'files',
      files: [{ ...completion, content: new_content }]
    } as any
  }

  if (clipboard_content.type == 'patches' && clipboard_content.patches) {
    const rename_map = new Map<string, string>()
    clipboard_content.patches.forEach((patch) => {
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

    let success_count = 0
    let failure_count = 0
    let all_original_states: OriginalFileState[] = []
    const failed_patches: Diff[] = []
    const applied_patches: {
      patch: Diff
      original_states: OriginalFileState[]
      diff_fallback_method?: 'recount' | 'search_and_replace'
    }[] = []
    let any_patch_used_fallback = false

    const total_patches = clipboard_content.patches.length

    for (let i = 0; i < total_patches; i++) {
      const patch = clipboard_content.patches[i]
      let workspace_path = default_workspace

      if (patch.workspace_name && workspace_map.has(patch.workspace_name)) {
        workspace_path = workspace_map.get(patch.workspace_name)!
      }

      const result = await apply_git_patch(patch.content, workspace_path)

      if (result.success) {
        if (result.diff_fallback_method && result.original_states) {
          for (const state of result.original_states) {
            state.is_fallback = true
            state.diff_fallback_method = result.diff_fallback_method
          }
        }
        success_count++
        if (result.original_states) {
          all_original_states = all_original_states.concat(
            result.original_states
          )
          applied_patches.push({
            patch,
            original_states: result.original_states,
            diff_fallback_method: result.diff_fallback_method
          })
        }
        if (result.diff_fallback_method) {
          any_patch_used_fallback = true
        }
      } else {
        failure_count++
        failed_patches.push(patch)
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

    if (failure_count > 0) {
      const api_providers_manager = new ModelProvidersManager(context)
      const config_result = await get_intelligent_update_config(
        api_providers_manager,
        false,
        context
      )

      if (!config_result) {
        if (success_count > 0 && all_original_states.length > 0) {
          await undo_files({ original_states: all_original_states })
          update_undo_button_state({ context, panel_provider, states: null })
        }
        return null
      }

      const { provider, config: intelligent_update_config } = config_result

      let endpoint_url = ''
      if (provider.type == 'built-in') {
        const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
        endpoint_url = provider_info.base_url
      } else {
        endpoint_url = provider.base_url
      }

      const failed_patches_as_code_blocks = failed_patches
        .map((patch) => {
          const file_path_with_workspace = patch.workspace_name
            ? `${patch.workspace_name}/${patch.file_path}`
            : patch.file_path
          return `\`\`\`\n// ${file_path_with_workspace}\n${patch.content}\n\`\`\``
        })
        .join('\n')

      try {
        const intelligent_update_states = await handle_intelligent_update({
          endpoint_url,
          api_key: provider.api_key,
          config: intelligent_update_config,
          chat_response: failed_patches_as_code_blocks,
          context: context,
          is_single_root_folder_workspace,
          panel_provider
        })

        if (intelligent_update_states) {
          const combined_states = [
            ...all_original_states,
            ...intelligent_update_states
          ]
          set_new_paths_in_original_states(combined_states)
          await apply_file_relocations(combined_states)
          update_undo_button_state({
            context,
            panel_provider,
            states: combined_states,
            applied_content: chat_response,
            original_editor_state: args?.original_editor_state
          })
          return {
            original_states: combined_states,
            chat_response
          }
        } else {
          if (success_count > 0 && all_original_states.length > 0) {
            await undo_files({ original_states: all_original_states })
            update_undo_button_state({ context, panel_provider, states: null })
          }
        }
      } catch (error) {
        Logger.error({
          function_name: 'process_chat_response',
          message: 'Error during intelligent update of failed patches'
        })

        const response = await vscode.window.showErrorMessage(
          dictionary.error_message.ERROR_DURING_INTELLIGENT_UPDATE_FIX_ATTEMPT,
          'Keep changes',
          'Undo'
        )

        if (response == 'Undo' && all_original_states.length > 0) {
          await undo_files({ original_states: all_original_states })
          update_undo_button_state({ context, panel_provider, states: null })
        }
      }
    } else if (success_count > 0) {
      if (any_patch_used_fallback) {
        ;(async () => {
          const fallback_patches_count = applied_patches.filter(
            (p) => p.diff_fallback_method
          ).length
          const fallback_files = applied_patches
            .filter((p) => p.diff_fallback_method)
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
    if (!clipboard_content.files || clipboard_content.files.length == 0) {
      const editor = vscode.window.activeTextEditor
      if (editor) {
        const choice = await vscode.window.showWarningMessage(
          'No valid code blocks found in the clipboard text. Apply found text to the active editor with the Intelligent Update API tool?',
          { modal: true },
          'Apply'
        )

        if (choice == 'Apply') {
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

          const intelligent_update_states = await handle_intelligent_update({
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
      }

      return null
    }

    let selected_mode_label: 'Fast replace' | 'Intelligent update' | undefined =
      undefined

    const all_files_new = await check_if_all_files_new(clipboard_content.files)

    if (all_files_new) {
      selected_mode_label = 'Fast replace'
      Logger.info({
        function_name: 'process_chat_response',
        message: 'All files are new - automatically selecting fast replace mode'
      })
    } else {
      let has_truncated_fragments = false
      if (
        args?.edit_format === undefined || // Is undefined when invoked manually
        args?.edit_format == 'truncated'
      ) {
        has_truncated_fragments = check_for_truncated_fragments(
          clipboard_content.files
        )
      }

      if (has_truncated_fragments) {
        selected_mode_label = 'Intelligent update'
        Logger.info({
          function_name: 'process_chat_response',
          message:
            'Auto-selecting intelligent update mode due to detected truncated fragments'
        })
      } else {
        selected_mode_label = 'Fast replace'
        Logger.info({
          function_name: 'process_chat_response',
          message: 'Defaulting to Fast replace mode'
        })
      }
    }

    let final_original_states: OriginalFileState[] | null = null
    let operation_success = false

    if (selected_mode_label == 'Fast replace') {
      const result = await handle_fast_replace(clipboard_content.files)
      if (result.success && result.original_states) {
        if (!args?.suppress_fast_replace_inaccuracies_dialog) {
          result.original_states.forEach((s) => (s.is_replaced = true))
        }
        final_original_states = result.original_states
        operation_success = true
      }
      Logger.info({
        function_name: 'process_chat_response',
        message: 'Fast replace handler finished.',
        data: { success: result.success }
      })
    } else if (selected_mode_label == 'Intelligent update') {
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
        const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
        endpoint_url = provider_info.base_url
      } else {
        endpoint_url = provider.base_url
      }

      final_original_states = await handle_intelligent_update({
        endpoint_url,
        api_key: provider.api_key,
        config: intelligent_update_config,
        chat_response,
        context: context,
        is_single_root_folder_workspace,
        panel_provider
      })

      if (final_original_states) {
        operation_success = true
      }
      Logger.info({
        function_name: 'process_chat_response',
        message: 'Intelligent update handler finished.',
        data: { success: operation_success }
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
