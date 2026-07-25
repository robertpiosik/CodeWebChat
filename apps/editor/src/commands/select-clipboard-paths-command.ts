import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { get_all_workspace_files } from '@/context/helpers/get-all-workspace-files'
import { display_token_count } from '@/utils/display-token-count'
import { LAST_APPLY_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY } from '@/constants/state-keys'
import { t } from '@/i18n'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { extract_paths_from_text } from '@/utils/extract-paths-from-text'

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

        while (true) {
          const currently_checked = workspace_provider.get_checked_files()
          const currently_checked_set = new Set(currently_checked)

          const quick_pick_items = await Promise.all(
            absolute_paths.map(async (file_path) => {
              const token_count =
                await workspace_provider.calculate_file_tokens(file_path)

              const formatted_token_count = display_token_count(
                token_count.total
              )

              const root =
                workspace_provider.get_workspace_root_for_file(file_path)
              const relative_path = root
                ? path.relative(root, file_path)
                : file_path
              const dir_name = path.dirname(relative_path)
              let display_dir = dir_name === '.' ? '' : dir_name

              if (root && workspace_roots.length > 1) {
                const workspace_name =
                  workspace_provider.get_workspace_name(root)
                display_dir = display_dir
                  ? `${workspace_name}/${display_dir}`
                  : workspace_name
              }

              return {
                label: path.basename(file_path),
                description: display_dir
                  ? `${formatted_token_count} · ${display_dir}`
                  : formatted_token_count,
                picked: currently_checked_set.has(file_path),
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

          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { file_path: string }
          >()
          quick_pick.title = t('command.select-clipboard-paths.title')
          quick_pick.placeholder = t('command.select-clipboard-paths.include')
          quick_pick.canSelectMany = true
          quick_pick.items = quick_pick_items
          quick_pick.ignoreFocusOut = true
          quick_pick.selectedItems = quick_pick_items.filter(
            (item) => item.picked
          )
          quick_pick.buttons = [
            { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
          ]

          const selected_items = await new Promise<
            | readonly (vscode.QuickPickItem & { file_path: string })[]
            | undefined
          >((resolve) => {
            let is_accepted = false

            quick_pick.onDidTriggerButton((_button) => {
              quick_pick.hide()
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

          if (!selected_items || selected_items.length === 0) {
            return
          }

          const selected_paths = selected_items.map((item) => item.file_path)
          let paths_to_apply = selected_paths
          let should_continue = false

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

            if (!is_identical) {
              const quick_pick_options = [
                {
                  label: t('command.select-clipboard-paths.replace'),
                  description: t(
                    'command.select-clipboard-paths.replace-description'
                  )
                },
                {
                  label: t('command.select-clipboard-paths.merge'),
                  description: t(
                    'command.select-clipboard-paths.merge-description'
                  )
                }
              ]

              const last_choice_label =
                extension_context.workspaceState.get<string>(
                  LAST_APPLY_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY
                )

              const quick_pick_merge = vscode.window.createQuickPick()
              quick_pick_merge.items = quick_pick_options
              quick_pick_merge.placeholder = t(
                'command.select-clipboard-paths.apply',
                {
                  count: selected_paths.length
                }
              )
              quick_pick_merge.buttons = [vscode.QuickInputButtons.Back]

              if (last_choice_label) {
                const active_item = quick_pick_options.find(
                  (opt) => opt.label === last_choice_label
                )
                if (active_item) {
                  quick_pick_merge.activeItems = [active_item]
                }
              }

              const choice = await new Promise<
                vscode.QuickPickItem | 'back' | undefined
              >((resolve) => {
                let is_accepted = false
                quick_pick_merge.onDidTriggerButton((button) => {
                  if (button === vscode.QuickInputButtons.Back) {
                    resolve('back')
                    quick_pick_merge.hide()
                  }
                })
                quick_pick_merge.onDidAccept(() => {
                  is_accepted = true
                  resolve(quick_pick_merge.selectedItems[0])
                  quick_pick_merge.hide()
                })
                quick_pick_merge.onDidHide(() => {
                  if (!is_accepted) resolve('back')
                  quick_pick_merge.dispose()
                })
                quick_pick_merge.show()
              })

              if (choice === 'back') {
                should_continue = true
              } else if (!choice) {
                return
              } else {
                await extension_context.workspaceState.update(
                  LAST_APPLY_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY,
                  choice.label
                )

                if (
                  choice.label === t('command.select-clipboard-paths.merge')
                ) {
                  paths_to_apply = [
                    ...new Set([...currently_checked, ...selected_paths])
                  ]
                }
              }
            }
          }

          if (should_continue) {
            continue
          }

          Logger.info({
            message: `Selected ${selected_paths.length} clipboard paths.`,
            data: { paths: selected_paths }
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
          return
        }
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
