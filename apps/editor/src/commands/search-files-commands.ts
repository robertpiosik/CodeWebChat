import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { search_files } from '@/features/search-files'
import { WebSocketManager } from '@/services/websocket-manager'
import { prompt_for_provided_results } from '@/features/search-files/utils/prompt-for-provided-results'

export const get_target_folder_path = async (
  item?: any
): Promise<string | undefined> => {
  let folder_path = item?.resourceUri?.fsPath
  if (folder_path) {
    try {
      const stats = await fs.promises.stat(folder_path)
      if (!stats.isDirectory()) {
        folder_path = path.dirname(folder_path)
      }
    } catch (error) {
      folder_path = undefined
    }
  }
  return folder_path
}

export const search_files_commands = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  websocket_manager: WebSocketManager
) => {
  const search_handler = async (item?: any) => {
    const folder_path = await get_target_folder_path(item)

    let all_files: string[] | undefined

    const get_files_lazy = async () => {
      if (all_files) return all_files
      const files: string[] = []
      if (folder_path) {
        const result = await workspace_provider.find_all_files(folder_path)
        files.push(...result)
      } else {
        const roots = workspace_provider.get_workspace_roots()
        for (const root of roots) {
          const result = await workspace_provider.find_all_files(root)
          files.push(...result)
        }
      }
      all_files = files
      return all_files
    }

    const result = await search_files({
      get_files: get_files_lazy,
      workspace_provider,
      extension_context,
      websocket_manager
    })

    if (!result || result == 'back') return

    const resolved_all_files = await get_files_lazy()

    const { selected_paths, matched_paths } = result

    const unchecked_paths = matched_paths.filter(
      (file_path) => !selected_paths.includes(file_path)
    )

    const currently_checked = workspace_provider.get_checked_files()
    const currently_checked_in_folder = currently_checked.filter((f) =>
      resolved_all_files.includes(f)
    )

    if (currently_checked_in_folder.length > 0) {
      const selected_paths_set = new Set(selected_paths)
      const is_identical =
        currently_checked_in_folder.length == selected_paths_set.size &&
        currently_checked_in_folder.every((file) =>
          selected_paths_set.has(file)
        )

      if (is_identical) {
        vscode.window.showInformationMessage(
          t('common.info.context-already-set')
        )
        return
      }
    }

    const paths_to_apply = [
      ...new Set([
        ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
        ...selected_paths
      ])
    ]

    await workspace_provider.set_checked_files(paths_to_apply)

    Logger.info({
      message: `Selected ${selected_paths.length} files from search.`,
      data: { paths: selected_paths, folder: folder_path }
    })

    vscode.window.showInformationMessage(t('common.success.context-updated'))
  }

  return [
    vscode.commands.registerCommand('codeWebChat.searchFiles', () =>
      search_handler()
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesFromDirectory',
      (item: any) => search_handler(item)
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesFromFile',
      (item: any) => search_handler(item)
    ),
    vscode.commands.registerCommand(
      'codeWebChat.internal.searchFilesWithResults',
      async (files: { path: string; checked: boolean }[]) => {
        while (true) {
          const result = await prompt_for_provided_results({
            files,
            workspace_provider
          })

          if (!result) return undefined

          if ('action' in result) {
            const sub_search_result = await search_files({
              get_files: async () => result.matched_paths,
              workspace_provider,
              extension_context,
              websocket_manager,
              show_back_button: true,
              is_sub_search: true
            })

            if (sub_search_result === 'back') {
              continue
            }

            return sub_search_result
          }

          return result
        }
      }
    )
  ]
}
