import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'

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
            title: 'Searching for references...'
          },
          async () => {
            const locations = await vscode.commands.executeCommand<
              vscode.Location[]
            >('vscode.executeReferenceProvider', document.uri, position)

            if (!locations) return []

            const unique_paths = new Set<string>()
            locations.forEach((loc) => {
              const file_path = loc.uri.fsPath
              if (
                workspace_provider.get_workspace_root_for_file(file_path) &&
                !workspace_provider.is_ignored_by_patterns(file_path)
              ) {
                unique_paths.add(file_path)
              }
            })
            return Array.from(unique_paths)
          }
        )

        if (matched_files.length === 0) {
          vscode.window.showInformationMessage(
            'No files found referencing the current symbol.'
          )
          return
        }

        const open_file_button = {
          iconPath: new vscode.ThemeIcon('go-to-file'),
          tooltip: 'Open file'
        }

        const quick_pick_items = matched_files.map((file_path) => {
          const workspace_root =
            workspace_provider.get_workspace_root_for_file(file_path)
          const relative_path = workspace_root
            ? path.relative(workspace_root, file_path)
            : file_path

          const dir_name = path.dirname(relative_path)
          return {
            label: path.basename(file_path),
            description: dir_name == '.' ? '' : dir_name,
            file_path: file_path,
            buttons: [open_file_button]
          }
        })

        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { file_path: string }
        >()
        quick_pick.items = quick_pick_items
        quick_pick.selectedItems = quick_pick_items
        quick_pick.canSelectMany = true
        quick_pick.placeholder = 'Select files to check for context'
        quick_pick.title = `Found ${matched_files.length} file${
          matched_files.length == 1 ? '' : 's'
        }`
        quick_pick.ignoreFocusOut = true

        const close_button = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: 'Close'
        }
        quick_pick.buttons = [close_button]

        const selected_items = await new Promise<
          readonly (vscode.QuickPickItem & { file_path: string })[] | undefined
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
                  preview: true
                })
              } catch (error) {
                vscode.window.showErrorMessage(`Error opening file: ${error}`)
              }
            }
          })

          quick_pick.show()
        })

        if (!selected_items || selected_items.length == 0) {
          return
        }

        const selected_paths = selected_items.map((item) => item.file_path)
        const currently_checked = workspace_provider.get_checked_files()

        const selected_paths_set = new Set(selected_paths)
        const unselected_files_set = new Set(
          matched_files.filter((file) => !selected_paths_set.has(file))
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
        vscode.window.showInformationMessage(`Context updated.`)
      } catch (error) {
        vscode.window.showErrorMessage(
          `Reference check failed: ${
            error instanceof Error ? error.message : String(error)
          }`
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
