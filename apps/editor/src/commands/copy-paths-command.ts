import * as vscode from 'vscode'
import * as path from 'path'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '../i18n'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { OpenEditorsProvider } from '../context/providers/open-editors/open-editors-provider'
import { AsciiTree } from '../utils/ascii-tree'
import { LAST_COPY_PATHS_FORMAT_STATE_KEY } from '../constants/state-keys'

type Format = 'bullet-list' | 'comma-separated' | 'ascii-tree'

const format_paths = (files: string[], format: Format) => {
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

const resolve_format = async (
  extension_context: vscode.ExtensionContext
): Promise<Format | undefined> => {
  const last_format = extension_context.globalState.get<Format>(
    LAST_COPY_PATHS_FORMAT_STATE_KEY
  )

  type Option = vscode.QuickPickItem & { value: Format }

  const options: Option[] = [
    {
      label: t('command.copy-paths.format.bullet-list'),
      value: 'bullet-list'
    },
    {
      label: t('command.copy-paths.format.comma-separated'),
      value: 'comma-separated'
    },
    {
      label: t('command.copy-paths.format.ascii-tree'),
      value: 'ascii-tree'
    }
  ]

  const quick_pick = vscode.window.createQuickPick<Option>()
  quick_pick.title = t('command.copy-paths.title')
  quick_pick.placeholder = t('command.copy-paths.placeholder')
  quick_pick.items = options

  if (last_format) {
    const last_option = options.find((o) => o.value === last_format)
    if (last_option) {
      quick_pick.activeItems = [last_option]
    }
  }

  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  quick_pick.buttons = [close_button]

  const selected = await new Promise<Option | undefined>((resolve) => {
    let is_accepted = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === close_button) {
        resolve(undefined)
        quick_pick.hide()
      }
    })

    quick_pick.onDidAccept(() => {
      is_accepted = true
      resolve(quick_pick.selectedItems[0])
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

  if (selected) {
    await extension_context.globalState.update(
      LAST_COPY_PATHS_FORMAT_STATE_KEY,
      selected.value
    )
    return selected.value
  }

  return undefined
}

export const copy_paths_commands = (
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider,
  extension_context: vscode.ExtensionContext
) => {
  return [
    vscode.commands.registerCommand('codeWebChat.copyPaths', async () => {
      const checked_files = workspace_provider.get_checked_files()

      if (checked_files.length == 0) {
        vscode.window.showWarningMessage(t('common.warning.no-files-selected'))
        return
      }

      const format = await resolve_format(extension_context)
      if (!format) return

      const paths_text = format_paths(checked_files, format)
      await vscode.env.clipboard.writeText(paths_text)
      vscode.window.showInformationMessage(t('command.copy-paths.copied'))
    }),

    vscode.commands.registerCommand(
      'codeWebChat.copyPathsOpenEditors',
      async () => {
        if (!open_editors_provider) return
        const checked_files = open_editors_provider.get_checked_files()

        if (checked_files.length == 0) {
          vscode.window.showWarningMessage(
            t('common.warning.no-files-selected')
          )
          return
        }

        const format = await resolve_format(extension_context)
        if (!format) return

        const paths_text = format_paths(checked_files, format)
        await vscode.env.clipboard.writeText(paths_text)
        vscode.window.showInformationMessage(t('command.copy-paths.copied'))
      }
    )
  ]
}
