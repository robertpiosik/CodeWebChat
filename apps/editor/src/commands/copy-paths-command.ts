import * as vscode from 'vscode'
import * as path from 'path'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '../i18n'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { OpenEditorsProvider } from '../context/providers/open-editors/open-editors-provider'
import { AsciiTree } from '../utils/ascii-tree'

const format_paths = (files: string[]) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const format = config.get<'bullet-list' | 'comma-separated' | 'ascii-tree'>(
    'copyPathsFormat',
    'bullet-list'
  )

  const workspace_folders = vscode.workspace.workspaceFolders
  const is_multi_root = !!workspace_folders && workspace_folders.length > 1

  const display_paths = files.map((file_path) => {
    const file_uri = vscode.Uri.file(file_path)
    let display_path: string
    const workspace_folder = vscode.workspace.getWorkspaceFolder(file_uri)

    if (is_multi_root && workspace_folder) {
      const relative_path = path.relative(
        workspace_folder.uri.fsPath,
        file_path
      )
      display_path = `${workspace_folder.name}/${relative_path}`
    } else {
      display_path = vscode.workspace.asRelativePath(file_path)
    }

    return display_path.replace(/\\/g, '/')
  })

  if (format == 'ascii-tree') {
    return AsciiTree.generate(display_paths)
  } else if (format == 'comma-separated') {
    return display_paths.map((display_path) => `\`${display_path}\``).join(', ')
  }

  return display_paths.map((display_path) => `- \`${display_path}\``).join('\n')
}

export const copy_paths_commands = (
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider
) => {
  return [
    vscode.commands.registerCommand('codeWebChat.copyPaths', async () => {
      const checked_files = workspace_provider.get_checked_files()

      if (checked_files.length == 0) {
        vscode.window.showWarningMessage(
          t('command.copy-context.warning.no-files-selected')
        )
        return
      }

      const paths_text = format_paths(checked_files)
      await vscode.env.clipboard.writeText(paths_text)
      vscode.window.showInformationMessage('Paths copied to clipboard.')
    }),

    vscode.commands.registerCommand(
      'codeWebChat.copyPathsOpenEditors',
      async () => {
        if (!open_editors_provider) return
        const checked_files = open_editors_provider.get_checked_files()

        if (checked_files.length == 0) {
          vscode.window.showWarningMessage(
            dictionary.warning_message.NO_OPEN_EDITORS_SELECTED
          )
          return
        }

        const paths_text = format_paths(checked_files)
        await vscode.env.clipboard.writeText(paths_text)
        vscode.window.showInformationMessage('Paths copied to clipboard.')
      }
    )
  ]
}
