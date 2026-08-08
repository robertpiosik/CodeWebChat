import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { get_all_workspace_files } from '@/context/helpers/get-all-workspace-files'
import { display_token_count } from '@/utils/display-token-count'
import { t } from '@/i18n'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { extract_paths_from_text } from '@/utils/extract-paths-from-text'
import { search_files } from '@/features/search-files'

export const select_clipboard_paths_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectClipboardPaths',
    async () => {
      try {
        const text = await vscode.env.clipboard.readText()
        if (!text || !text.trim()) {
          vscode.window.showInformationMessage('Clipboard is empty.')
          return
        }

        const workspace_files = await get_all_workspace_files({
          workspace_provider
        })

        const valid_paths = extract_paths_from_text({
          text,
          workspace_files
        })

        if (valid_paths.length === 0) {
          vscode.window.showInformationMessage(
            t('command.select-clipboard-paths.no-valid')
          )
          return
        }

        const workspace_roots = workspace_provider.get_workspace_roots()

        const absolute_paths = valid_paths
          .map((p) => {
            if (workspace_roots.length > 1) {
              const parts = p.split('/')
              const workspace_name = parts[0]
              const relative = parts.slice(1).join('/')
              const root = workspace_roots.find(
                (r) =>
                  workspace_provider.get_workspace_name(r) === workspace_name
              )
              return root ? path.join(root, relative) : p
            } else {
              return path.join(workspace_roots[0], p)
            }
          })
          .filter((p) => fs.existsSync(p))

        if (absolute_paths.length === 0) {
          vscode.window.showInformationMessage(
            t('command.select-clipboard-paths.no-valid')
          )
          return
        }

        const currently_checked = workspace_provider.get_checked_files()
        const currently_checked_set = new Set(currently_checked)

        const quick_pick_items: (vscode.QuickPickItem & {
          file_path: string
        })[] = await Promise.all(
          absolute_paths.map(async (file_path) => {
            const token_count =
              await workspace_provider.calculate_file_tokens(file_path)

            const formatted_token_count = display_token_count(token_count.total)

            const root =
              workspace_provider.get_workspace_root_for_file(file_path)
            const relative_path = root
              ? path.relative(root, file_path)
              : file_path
            const dir_name = path.dirname(relative_path)
            let display_dir = dir_name === '.' ? '' : dir_name

            if (root && workspace_roots.length > 1) {
              const workspace_name = workspace_provider.get_workspace_name(root)
              display_dir = display_dir
                ? `${workspace_name}/${display_dir}`
                : workspace_name
            }

            return {
              label: path.basename(file_path),
              description: display_dir
                ? `${formatted_token_count} · ${display_dir}`
                : formatted_token_count,
              file_path,
              buttons: [
                {
                  iconPath: new vscode.ThemeIcon('go-to-file'),
                  tooltip: t('common.go-to-file')
                }
              ]
            }
          })
        )

        let current_selected_items = quick_pick_items.filter((item) =>
          currently_checked_set.has(item.file_path)
        )
        let paths_to_apply: string[] = []
        let final_selected_paths: string[] = []

        while (true) {
          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { file_path: string }
          >()
          quick_pick.title = t('command.select-clipboard-paths.title')
          quick_pick.placeholder = t('command.select-clipboard-paths.include')
          quick_pick.canSelectMany = true
          quick_pick.items = quick_pick_items
          quick_pick.ignoreFocusOut = true
          quick_pick.selectedItems = current_selected_items

          const close_button = {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
          const search_button = {
            iconPath: new vscode.ThemeIcon('search'),
            tooltip: t('common.search-in-results')
          }

          quick_pick.buttons = [search_button, close_button]

          const selected_items = await new Promise<
            | readonly (vscode.QuickPickItem & { file_path: string })[]
            | undefined
            | 'search'
          >((resolve) => {
            let is_accepted = false

            quick_pick.onDidTriggerButton((button) => {
              if (button === close_button) {
                resolve(undefined)
                quick_pick.hide()
              } else if (button === search_button) {
                current_selected_items = [...quick_pick.selectedItems]
                resolve('search')
                quick_pick.hide()
              }
            })

            quick_pick.onDidTriggerItemButton(async (e) => {
              if (e.button.tooltip === t('common.go-to-file')) {
                const uri = vscode.Uri.file(e.item.file_path)
                vscode.window.showTextDocument(uri, { preview: true })
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
              get_files: async () => absolute_paths,
              workspace_provider,
              extension_context,
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

          final_selected_paths = selected_paths

          if (currently_checked.length > 0) {
            const selected_paths_set = new Set(selected_paths)
            const is_identical =
              currently_checked.length === selected_paths_set.size &&
              currently_checked.every((file) => selected_paths_set.has(file))

            if (is_identical) {
              vscode.window.showInformationMessage(
                dictionary.information_message.CONTEXT_ALREADY_SET
              )
              return
            }
          }

          paths_to_apply = [
            ...new Set([...currently_checked, ...selected_paths])
          ]

          break
        }

        Logger.info({
          message: `Selected ${final_selected_paths.length} clipboard paths.`,
          data: { paths: final_selected_paths }
        })

        await workspace_provider.set_checked_files(paths_to_apply)

        vscode.window.showInformationMessage(
          t('common.success.context-updated')
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to select clipboard paths: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        Logger.error({
          function_name: 'select_clipboard_paths_command',
          message: 'Error handling clipboard paths command',
          data: error
        })
      }
    }
  )
}
