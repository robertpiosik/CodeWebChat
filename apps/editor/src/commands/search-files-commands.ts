import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { search_files } from '@/features/search-files'
import { WebSocketManager } from '@/services/websocket-manager'
import { prompt_for_provided_results } from '@/features/search-files/utils/prompt-for-provided-results'
import { LAST_SEARCH_FILES_MERGE_REPLACE_OPTION_STATE_KEY } from '@/constants/state-keys'

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
  const process_search_result = async (params: {
    result: { selected_paths: string[]; matched_paths: string[]; title: string }
    resolved_all_files: string[]
    folder_path?: string
    is_search_in_selected?: boolean
  }): Promise<undefined | void> => {
    const unchecked_paths = params.result.matched_paths.filter(
      (file_path) => !params.result.selected_paths.includes(file_path)
    )

    const currently_checked = workspace_provider.get_checked_files()
    const currently_checked_in_folder = currently_checked.filter((f) =>
      params.resolved_all_files.includes(f)
    )

    if (currently_checked_in_folder.length > 0) {
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

    if (params.is_search_in_selected) {
      if (
        params.result.selected_paths.length < params.result.matched_paths.length
      ) {
        const last_action = extension_context.workspaceState.get<string>(
          LAST_SEARCH_FILES_MERGE_REPLACE_OPTION_STATE_KEY
        )

        const action = await new Promise<{ value: string } | undefined>(
          (resolve) => {
            const quick_pick = vscode.window.createQuickPick<{
              label: string
              description: string
              value: string
            }>()
            const items = [
              {
                label: t('command.search-files.action.merge'),
                description: t('command.search-files.action.merge-description'),
                value: 'merge'
              },
              {
                label: t('command.search-files.action.replace'),
                description: t(
                  'command.search-files.action.replace-description'
                ),
                value: 'replace'
              }
            ]
            quick_pick.items = items
            const active_item =
              items.find((i) => i.value === last_action) || items[0]
            quick_pick.activeItems = [active_item]
            quick_pick.title = params.result.title
            quick_pick.placeholder = t(
              'command.search-files.action.merge-or-replace-placeholder'
            )
            quick_pick.ignoreFocusOut = true

            let is_resolved = false

            quick_pick.onDidAccept(() => {
              const selected = quick_pick.selectedItems[0]
              if (selected) {
                is_resolved = true
                resolve({ value: selected.value })
                quick_pick.hide()
              }
            })

            quick_pick.onDidHide(() => {
              if (!is_resolved) {
                resolve(undefined)
              }
              quick_pick.dispose()
            })

            quick_pick.show()
          }
        )

        if (!action) return undefined

        await extension_context.workspaceState.update(
          LAST_SEARCH_FILES_MERGE_REPLACE_OPTION_STATE_KEY,
          action.value
        )

        if (action.value === 'merge') {
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
      paths_to_apply = [
        ...new Set([
          ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
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
    vscode.commands.registerCommand('codeWebChat.searchFiles', () =>
      search_handler()
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
