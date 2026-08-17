import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { search_files } from '@/features/search-files'
import { WebSocketManager } from '@/services/websocket-manager'
import { prompt_for_provided_results } from './utils/prompt-for-provided-results'
import { get_target_folder_path } from './utils/get-target-folder-path'

export const search_files_commands = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  websocket_manager: WebSocketManager
) => {
  const process_search_result = async (params: {
    result: {
      selected_paths: string[]
      matched_paths: string[]
      title?: string
    }
    resolved_all_files: string[]
    folder_path?: string
    is_search_in_selected?: boolean
    is_provided_files?: boolean
  }): Promise<undefined | void> => {
    const unchecked_paths = params.result.matched_paths.filter(
      (file_path) => !params.result.selected_paths.includes(file_path)
    )

    const currently_checked = workspace_provider.get_checked_files()
    const currently_checked_in_folder = currently_checked.filter((f) =>
      params.resolved_all_files.includes(f)
    )

    if (currently_checked_in_folder.length > 0 && !params.is_provided_files) {
      const selected_paths_set = new Set(params.result.selected_paths)
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

    let paths_to_apply: string[]
    const all_listed_were_selected = params.result.matched_paths.every((file) =>
      currently_checked.includes(file)
    )

    if (params.is_provided_files) {
      if (currently_checked.length > 0) {
        const action = all_listed_were_selected ? 'replace' : 'merge'

        if (action === 'merge') {
          paths_to_apply = [
            ...new Set([
              ...currently_checked.filter(
                (p) => !params.result.matched_paths.includes(p)
              ),
              ...params.result.selected_paths
            ])
          ]
        } else {
          paths_to_apply = [...params.result.selected_paths]
        }
      } else {
        paths_to_apply = [...params.result.selected_paths]
      }
    } else if (params.is_search_in_selected) {
      if (
        params.result.selected_paths.length < params.result.matched_paths.length
      ) {
        const action = all_listed_were_selected ? 'replace' : 'merge'

        if (action === 'merge') {
          paths_to_apply = [
            ...new Set([
              ...currently_checked.filter(
                (p) => !params.result.matched_paths.includes(p)
              ),
              ...params.result.selected_paths
            ])
          ]
        } else {
          paths_to_apply = [...params.result.selected_paths]
        }
      } else {
        paths_to_apply = [...params.result.selected_paths]
      }
    } else {
      let files_to_remove = unchecked_paths

      if (params.folder_path) {
        const unmatched_in_folder = params.resolved_all_files.filter(
          (f) => !params.result.matched_paths.includes(f)
        )
        files_to_remove = [...unchecked_paths, ...unmatched_in_folder]
      }

      paths_to_apply = [
        ...new Set([
          ...currently_checked.filter((p) => !files_to_remove.includes(p)),
          ...params.result.selected_paths
        ])
      ]
    }

    await workspace_provider.set_checked_files(paths_to_apply)

    Logger.info({
      message: `Selected ${params.result.selected_paths.length} files from search.`,
      data: { paths: params.result.selected_paths, folder: params.folder_path }
    })

    vscode.window.showInformationMessage(t('common.success.context-updated'))
  }

  const search_handler = async (
    item?: any,
    options?: {
      provided_files?: { path: string; checked: boolean }[]
    }
  ) => {
    if (options?.provided_files) {
      let decision:
        | { selected_paths: string[]; matched_paths: string[]; title?: string }
        | undefined = undefined

      let restored_selected_paths: string[] | undefined = undefined

      while (true) {
        const result = await prompt_for_provided_results({
          files: options.provided_files,
          workspace_provider,
          restored_selected_paths
        })

        if (!result) return

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
            restored_selected_paths = result.selected_paths
            continue
          }

          if (!sub_search_result) return

          decision = sub_search_result
          break
        }

        decision = result
        break
      }

      await process_search_result({
        result: decision,
        resolved_all_files: options.provided_files.map((f) => f.path),
        is_provided_files: true
      })
      return
    }

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

    while (true) {
      const result = await search_files({
        get_files: get_files_lazy,
        workspace_provider,
        extension_context,
        websocket_manager
      })

      if (!result || result == 'back') return

      const resolved_all_files = await get_files_lazy()

      await process_search_result({
        result,
        resolved_all_files,
        folder_path
      })

      break
    }
  }

  const search_selected_files_handler = async () => {
    const currently_checked = workspace_provider.get_checked_files()
    if (currently_checked.length === 0) {
      return
    }

    const get_files_lazy = async () => currently_checked

    while (true) {
      const result = await search_files({
        get_files: get_files_lazy,
        workspace_provider,
        extension_context,
        websocket_manager,
        disable_semantic: true
      })

      if (!result || result == 'back') return

      const resolved_all_files = await get_files_lazy()

      await process_search_result({
        result,
        resolved_all_files,
        is_search_in_selected: true
      })

      break
    }
  }

  return [
    vscode.commands.registerCommand(
      'codeWebChat.searchFiles',
      (
        item?: any,
        options?: { provided_files?: { path: string; checked: boolean }[] }
      ) => search_handler(item, options)
    ),
    vscode.commands.registerCommand('codeWebChat.searchSelectedFiles', () =>
      search_selected_files_handler()
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesFromDirectory',
      (item: any) => search_handler(item)
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesFromFile',
      (item: any) => search_handler(item)
    )
  ]
}
