import * as vscode from 'vscode'
import * as path from 'path'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '../i18n'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { OpenEditorsProvider } from '../context/providers/open-editors/open-editors-provider'

interface TreeNode {
  [key: string]: TreeNode
}

const build_tree = (paths: string[]): TreeNode => {
  const root: TreeNode = {}
  for (const path of paths) {
    const parts = path.split('/')
    let current = root
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }
  }
  return root
}

const print_tree = (node: TreeNode, prefix = ''): string[] => {
  const keys = Object.keys(node).sort()
  const lines: string[] = []
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const is_last = i == keys.length - 1
    lines.push(`${prefix}${is_last ? '└── ' : '├── '}${key}`)
    const child_prefix = prefix + (is_last ? '    ' : '│   ')
    lines.push(...print_tree(node[key], child_prefix))
  }
  return lines
}

const format_paths = (files: string[]) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const format = config.get<'list' | 'tree'>('copyPathsFormat', 'list')

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

  if (format == 'tree') {
    const root = build_tree(display_paths)
    return print_tree(root).join('\n')
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
