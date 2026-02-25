import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { t } from '../i18n'

export const check_referencing_files_for_context_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.checkReferencingFilesForContext',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        return
      }

      try {
        const document = editor.document
        const position = editor.selection.active

        const matched_files = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Window,
            title: t('command.context.check-references.searching')
          },
          async () => {
            const locations = await vscode.commands.executeCommand<
              vscode.Location[]
            >('vscode.executeReferenceProvider', document.uri, position)

            if (!locations) return []

            const file_map = new Map<string, vscode.Range>()
            locations.forEach((loc) => {
              const file_path = loc.uri.fsPath
              if (
                workspace_provider.get_workspace_root_for_file(file_path) &&
                !workspace_provider.is_ignored_by_patterns(file_path)
              ) {
                if (!file_map.has(file_path)) {
                  file_map.set(file_path, loc.range)
                }
              }
            })
            return Array.from(file_map.entries()).map(([file_path, range]) => ({
              file_path,
              range
            }))
          }
        )

        if (matched_files.length === 0) {
          vscode.window.showInformationMessage(
            t('command.context.check-references.no-files')
          )
          return
        }

        const open_file_button = {
          iconPath: new vscode.ThemeIcon('go-to-file'),
          tooltip: t('common.go-to-file')
        }

        const currently_checked = workspace_provider.get_checked_files()

        const quick_pick_items = matched_files.map(({ file_path, range }) => {
          const workspace_root =
            workspace_provider.get_workspace_root_for_file(file_path)
          const relative_path = workspace_root
            ? path.relative(workspace_root, file_path)
            : file_path

          const dir_name = path.dirname(relative_path)
          return {
            label: path.basename(file_path),
            description: dir_name == '.' ? '' : dir_name,
            file_path,
            range,
            buttons: [open_file_button]
          }
        })

        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { file_path: string; range: vscode.Range }
        >()
        quick_pick.items = quick_pick_items
        quick_pick.selectedItems = quick_pick_items.filter((item) =>
          currently_checked.includes(item.file_path)
        )
        quick_pick.canSelectMany = true
        quick_pick.placeholder = t(
          'command.context.check-references.select-files'
        )
        quick_pick.title = t('command.context.check-references.found-files', {
          count: matched_files.length
        })
        quick_pick.ignoreFocusOut = true

        const close_button = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: t('common.close')
        }
        quick_pick.buttons = [close_button]

        const selected_items = await new Promise<
          | readonly (vscode.QuickPickItem & {
              file_path: string
              range: vscode.Range
            })[]
          | undefined
        >((resolve) => {
          let is_accepted = false

          quick_pick.onDidTriggerButton((button) => {
            if (button === close_button) {
              resolve(undefined)
              quick_pick.hide()
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

          quick_pick.onDidTriggerItemButton(async (e) => {
            if (e.button === open_file_button) {
              try {
                const doc = await vscode.workspace.openTextDocument(
                  e.item.file_path
                )
                await vscode.window.showTextDocument(doc, {
                  preview: true,
                  selection: e.item.range
                })
              } catch (error) {
                vscode.window.showErrorMessage(
                  t('command.context.check-references.error-opening', {
                    error: String(error)
                  })
                )
              }
            }
          })

          quick_pick.show()
        })

        if (!selected_items || selected_items.length == 0) {
          return
        }

        const selected_paths = selected_items.map((item) => item.file_path)

        const selected_paths_set = new Set(selected_paths)
        const unselected_files_set = new Set(
          matched_files
            .map((m) => m.file_path)
            .filter((file_path) => !selected_paths_set.has(file_path))
        )
        const currently_checked_filtered = currently_checked.filter(
          (file) => !unselected_files_set.has(file)
        )
        const paths_to_apply = [
          ...new Set([...currently_checked_filtered, ...selected_paths])
        ]

        Logger.info({
          message: `Selected ${selected_paths.length} files from reference search.`,
          data: { paths: selected_paths }
        })

        await workspace_provider.set_checked_files(paths_to_apply)
        vscode.window.showInformationMessage(
          t('command.context.check-references.context-updated')
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          t('command.context.check-references.failed', {
            error: error instanceof Error ? error.message : String(error)
          })
        )
        Logger.error({
          function_name: 'check_referencing_files_for_context_command',
          message: 'Error searching references',
          data: error
        })
      }
    }
  )
}
