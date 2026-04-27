import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { LAST_SEARCH_FILES_FOR_CONTEXT_QUERY_STATE_KEY } from '../../constants/state-keys'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'

import { get_target_folder_path } from './utils/get-target-folder-path'
import { prompt_for_search_term } from './utils/prompt-for-search-term'
import { search_files_by_term } from './utils/search-files-by-term'
import { prompt_for_search_results } from './utils/prompt-for-search-results'

export const search_files_for_context_commands = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  const search_handler = async (item?: any, auto_submit: boolean = false) => {
    const folder_path = await get_target_folder_path(item)

    let initial_search_term =
      extension_context.workspaceState.get<string>(
        LAST_SEARCH_FILES_FOR_CONTEXT_QUERY_STATE_KEY
      ) || ''

    let should_auto_submit = false

    const active_editor = vscode.window.activeTextEditor
    if (active_editor) {
      const selection = active_editor.selection
      if (!selection.isEmpty) {
        const selected_text = active_editor.document.getText(selection).trim()
        if (selected_text.length > 0) {
          initial_search_term = selected_text
          if (auto_submit) {
            should_auto_submit = true
          }
        }
      }
    }

    while (true) {
      try {
        let search_term_input: string | undefined

        if (should_auto_submit && initial_search_term.length > 0) {
          search_term_input = initial_search_term
          should_auto_submit = false // Only auto-submit on the first iteration
        } else {
          const result = await prompt_for_search_term(initial_search_term)
          if (!result.value) return
          search_term_input = result.value
        }

        await extension_context.workspaceState.update(
          LAST_SEARCH_FILES_FOR_CONTEXT_QUERY_STATE_KEY,
          search_term_input
        )

        initial_search_term = search_term_input

        const search_term = search_term_input.trim()
        if (search_term.length == 0) return

        let all_files: string[] = []

        if (folder_path) {
          all_files = await workspace_provider.find_all_files(folder_path)
        } else {
          const roots = workspace_provider.get_workspace_roots()
          for (const root of roots) {
            const files = await workspace_provider.find_all_files(root)
            all_files.push(...files)
          }
        }

        const matched_files = await search_files_by_term({
          files: all_files,
          search_term
        })

        if (matched_files.length == 0) {
          vscode.window.showInformationMessage(t('command.search.no-files'))
          continue
        }

        const selected_items = await prompt_for_search_results({
          matched_files,
          search_term,
          workspace_provider
        })

        if (selected_items == 'back') {
          continue
        }

        if (!selected_items) {
          return
        }

        const selected_paths = selected_items.map((item) => item.file_path)

        const unchecked_paths = matched_files.filter(
          (file_path) => !selected_paths.includes(file_path)
        )

        const currently_checked = workspace_provider.get_checked_files()

        const paths_to_apply = [
          ...new Set([
            ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
            ...selected_paths
          ])
        ]

        Logger.info({
          message: `Selected ${selected_paths.length} files from search in folder.`,
          data: { paths: selected_paths, folder: folder_path }
        })

        await workspace_provider.set_checked_files(paths_to_apply)

        const newly_selected_count = selected_paths.filter(
          (p) => !currently_checked.includes(p)
        ).length

        vscode.window.showInformationMessage(
          dictionary.information_message.ADDED_FILES_TO_CONTEXT(
            newly_selected_count
          )
        )
        break
      } catch (error) {
        vscode.window.showErrorMessage(
          t('command.search.failed', {
            error: error instanceof Error ? error.message : String(error)
          })
        )
        Logger.error({
          function_name: 'search_files_for_context_command',
          message: 'Error searching files for context',
          data: error
        })
        break
      }
    }
  }

  return [
    vscode.commands.registerCommand('codeWebChat.searchFilesForContext', () =>
      search_handler()
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesForContextFromDirectory',
      (item: any) => search_handler(item)
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesForContextFromFile',
      (item: any) => search_handler(item, true)
    )
  ]
}
