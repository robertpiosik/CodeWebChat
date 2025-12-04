import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../context/providers/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { extract_paths_from_text } from '../../utils/path-parser'
import { display_token_count } from '../../utils/display-token-count'

export function find_paths_in_clipboard_command(
  workspace_provider: WorkspaceProvider | undefined
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'codeWebChat.findPathsInClipboard',
    async () => {
      if (!workspace_provider) {
        vscode.window.showErrorMessage(
          dictionary.error_message.NO_WORKSPACE_PROVIDER
        )
        return
      }
      try {
        const clipboard_text = await vscode.env.clipboard.readText()
        if (!clipboard_text) {
          vscode.window.showInformationMessage(
            dictionary.information_message.NO_FILE_PATHS_FOUND_IN_CLIPBOARD
          )
          return
        }

        const paths = extract_paths_from_text(clipboard_text)
        if (paths.length == 0) {
          vscode.window.showInformationMessage(
            dictionary.information_message.NO_FILE_PATHS_FOUND_IN_CLIPBOARD
          )
          return
        }

        const workspace_roots = workspace_provider.getWorkspaceRoots()
        const absolute_paths: string[] = []

        const workspace_map = new Map<string, string>()
        if (vscode.workspace.workspaceFolders) {
          vscode.workspace.workspaceFolders.forEach((folder) => {
            workspace_map.set(folder.name, folder.uri.fsPath)
          })
        }

        for (const raw_path of paths) {
          if (path.isAbsolute(raw_path)) {
            absolute_paths.push(raw_path)
            continue
          }

          let resolved_path: string | null = null

          if (workspace_map.size > 1) {
            for (const [workspace_name, workspace_root] of workspace_map) {
              if (
                raw_path.startsWith(workspace_name + '/') ||
                raw_path.startsWith(workspace_name + '\\')
              ) {
                const relative_path = raw_path.substring(
                  workspace_name.length + 1
                )
                resolved_path = path.join(workspace_root, relative_path)
                break
              }
            }
          }

          if (resolved_path) {
            absolute_paths.push(resolved_path)
          } else {
            for (const root of workspace_roots) {
              const potential_path = path.join(root, raw_path)
              absolute_paths.push(potential_path)
            }
          }
        }

        const existing_paths = absolute_paths.filter((p) => {
          try {
            return fs.existsSync(p) && fs.statSync(p).isFile()
          } catch {
            return false
          }
        })

        if (existing_paths.length == 0) {
          vscode.window.showInformationMessage(
            dictionary.information_message
              .NO_MATCHING_FILES_FOUND_FOR_CLIPBOARD_PATHS
          )
          return
        }

        const quick_pick_items = await Promise.all(
          existing_paths.map(async (file_path) => {
            const token_count =
              await workspace_provider.calculate_file_tokens(file_path)
            const formatted_token_count = display_token_count(token_count)
            return {
              label: path.basename(file_path),
              description: `${formatted_token_count} ${path.dirname(
                path.relative(workspace_roots[0] || '', file_path)
              )}`,
              picked: true,
              file_path: file_path
            }
          })
        )

        const selected_items = await vscode.window.showQuickPick(
          quick_pick_items,
          {
            canPickMany: true,
            placeHolder: 'Select files to include',
            title: `Found ${existing_paths.length} File${
              existing_paths.length == 1 ? '' : 's'
            }`
          }
        )
        if (!selected_items || selected_items.length == 0) {
          return
        }
        const selected_paths = selected_items.map((item) => item.file_path)
        Logger.info({
          message: `Selected ${selected_paths.length} file${
            selected_paths.length == 1 ? '' : 's'
          }.`,
          data: { paths: selected_paths }
        })
        await workspace_provider.set_checked_files(selected_paths)
        vscode.window.showInformationMessage(
          `Selected ${selected_paths.length} file${
            selected_paths.length == 1 ? '' : 's'
          }.`
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_SELECT_FILES_FROM_CLIPBOARD(
            error instanceof Error ? error.message : String(error)
          )
        )
      }
    }
  )
}
