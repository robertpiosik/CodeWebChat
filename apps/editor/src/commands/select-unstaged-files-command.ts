import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { display_token_count } from '../utils/display-token-count'
import { t } from '@/i18n'
import { search_files } from '@/features/search-files'
import { WebSocketManager } from '@/services/websocket-manager'

export const select_unstaged_files_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  websocket_manager: WebSocketManager
): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectUnstagedFiles',
    async () => {
      try {
        const git_extension =
          vscode.extensions.getExtension('vscode.git')?.exports
        if (!git_extension) {
          vscode.window.showErrorMessage(
            t('common.error.git-integration-missing')
          )
          return
        }
        const git_api = git_extension.getAPI(1)
        if (!git_api) {
          vscode.window.showErrorMessage(
            dictionary.error_message.COULD_NOT_GET_GIT_API
          )
          return
        }

        if (git_api.repositories.length == 0) {
          vscode.window.showInformationMessage(
            dictionary.information_message.NO_GIT_REPOSITORY_FOUND_IN_WORKSPACE
          )
          return
        }

        const unstaged_file_paths: string[] = []
        for (const repo of git_api.repositories) {
          repo.state.workingTreeChanges.forEach((change: any) => {
            unstaged_file_paths.push(change.uri.fsPath)
          })
        }

        if (unstaged_file_paths.length == 0) {
          vscode.window.showInformationMessage(
            dictionary.information_message.NO_UNSTAGED_FILES_FOUND
          )
          return
        }

        const existing_unstaged_files = unstaged_file_paths.filter((p) => {
          try {
            return fs.existsSync(p) && fs.statSync(p).isFile()
          } catch {
            return false
          }
        })

        if (existing_unstaged_files.length == 0) {
          vscode.window.showInformationMessage(
            dictionary.information_message.NO_ACTIONABLE_UNSTAGED_FILES_FOUND
          )
          return
        }

        const workspace_roots = workspace_provider.get_workspace_roots()

        while (true) {
          const currently_checked = workspace_provider.get_checked_files()
          const currently_checked_set = new Set(currently_checked)

          const quick_pick_items = await Promise.all(
            existing_unstaged_files.map(async (file_path) => {
              const token_count =
                await workspace_provider.calculate_file_tokens(file_path)

              const formatted_token_count = display_token_count(
                token_count.total
              )
              const relative_path = path.relative(
                workspace_roots[0] || '',
                file_path
              )
              const dir_name = path.dirname(relative_path)
              const display_dir = dir_name == '.' ? '' : dir_name

              return {
                label: path.basename(file_path),
                description: display_dir
                  ? `${formatted_token_count} · ${display_dir}`
                  : formatted_token_count,
                picked: currently_checked_set.has(file_path),
                file_path,
                buttons: [
                  {
                    iconPath: new vscode.ThemeIcon(
                      'git-pull-request-go-to-changes'
                    ),
                    tooltip: t('command.select-unstaged-files.show-diff')
                  },
                  {
                    iconPath: new vscode.ThemeIcon('go-to-file'),
                    tooltip: t('common.go-to-file')
                  }
                ]
              }
            })
          )

          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { file_path: string }
          >()
          quick_pick.title = t('command.select-unstaged-files.title')
          quick_pick.placeholder = t('command.select-unstaged-files.include')
          quick_pick.canSelectMany = true
          quick_pick.items = quick_pick_items
          quick_pick.ignoreFocusOut = true
          quick_pick.selectedItems = quick_pick_items.filter(
            (item) => item.picked
          )

          const search_button = {
            iconPath: new vscode.ThemeIcon('search'),
            tooltip: t('common.search-in-results')
          }
          const close_button = {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }

          quick_pick.buttons = [search_button, close_button]

          const selected_items = await new Promise<
            | readonly (vscode.QuickPickItem & { file_path: string })[]
            | undefined
            | 'search'
          >((resolve) => {
            let is_accepted = false

            quick_pick.onDidTriggerButton((button) => {
              if (button === search_button) {
                resolve('search')
                quick_pick.hide()
              } else if (button === close_button) {
                resolve(undefined)
                quick_pick.hide()
              }
            })

            quick_pick.onDidTriggerItemButton(async (e) => {
              if (e.button.tooltip == t('common.go-to-file')) {
                const uri = vscode.Uri.file(e.item.file_path)
                vscode.window.showTextDocument(uri, { preview: true })
              } else if (
                e.button.tooltip == t('command.select-unstaged-files.show-diff')
              ) {
                const uri = vscode.Uri.file(e.item.file_path)
                await vscode.commands.executeCommand('git.openChange', uri)
              }
            })

            quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(quick_pick.selectedItems)
              quick_pick.hide()
            })

            quick_pick.onDidHide(() => {
              if (!is_accepted) {
                resolve(undefined)
              }
              quick_pick.dispose()
            })

            quick_pick.show()
          })

          if (
            !selected_items ||
            (Array.isArray(selected_items) && selected_items.length === 0)
          ) {
            return
          }

          let selected_paths: string[] = []

          if (selected_items === 'search') {
            const search_result = await search_files({
              get_files: async () => existing_unstaged_files,
              workspace_provider,
              extension_context,
              websocket_manager,
              show_back_button: true,
              disable_semantic: true
            })

            if (search_result === 'back') {
              continue
            }

            if (!search_result) {
              return
            }

            selected_paths = search_result.selected_paths
          } else {
            selected_paths = selected_items.map((item) => item.file_path)
          }

          if (selected_paths.length === 0) {
            return
          }

          if (currently_checked.length > 0) {
            const selected_paths_set = new Set(selected_paths)
            const is_identical =
              currently_checked.length == selected_paths_set.size &&
              currently_checked.every((file) => selected_paths_set.has(file))

            if (is_identical) {
              vscode.window.showInformationMessage(
                t('common.info.context-already-set')
              )
              return
            }
          }

          const paths_to_apply = [
            ...new Set([...currently_checked, ...selected_paths])
          ]

          Logger.info({
            message: `Selected ${selected_paths.length} unstaged file${
              selected_paths.length == 1 ? '' : 's'
            }.`,
            data: { paths: selected_paths }
          })

          await workspace_provider.set_checked_files(paths_to_apply)

          vscode.window.showInformationMessage(
            t('common.success.context-updated')
          )
          return
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_SELECT_UNSTAGED_FILES(
            error instanceof Error ? error.message : String(error)
          )
        )
        Logger.error({
          function_name: 'select_unstaged_files_command',
          message: 'Failed to select unstaged files',
          data: error
        })
      }
    }
  )
}
