import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { load_and_merge_global_contexts } from './global-storage-utils'
import { load_all_contexts, get_contexts_file_path } from './context-file-utils'
import { t } from '@/i18n'
import { LAST_APPLY_CONTEXT_OPTION_STATE_KEY } from '@/constants/state-keys'

export const select_context_source = async (params: {
  extension_context: vscode.ExtensionContext
  title: string
}): Promise<'internal' | 'file' | undefined> => {
  const { merged: internal_contexts } = load_and_merge_global_contexts(
    params.extension_context
  )

  const file_contexts_map = await load_all_contexts()
  let file_contexts_count = 0
  for (const info of file_contexts_map.values()) {
    file_contexts_count += info.contexts.length
  }

  const main_quick_pick_options: (vscode.QuickPickItem & {
    value: 'internal' | 'file'
  })[] = []

  main_quick_pick_options.push({
    label: t('command.context-restoration.sources.workspace-state'),
    description: `${internal_contexts.length} ${
      internal_contexts.length == 1 ? 'entry' : 'entries'
    }`,
    value: 'internal'
  })

  const open_file_button = {
    iconPath: new vscode.ThemeIcon('go-to-file'),
    tooltip: t('command.context-restoration.action.open-json')
  }

  main_quick_pick_options.push({
    label: t('command.context-restoration.sources.json-file'),
    description: `${file_contexts_count} ${
      file_contexts_count == 1 ? 'entry' : 'entries'
    }`,
    value: 'file',
    buttons: [open_file_button]
  })

  const main_quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { value: 'internal' | 'file' }
  >()
  main_quick_pick.title = params.title
  main_quick_pick.items = main_quick_pick_options
  main_quick_pick.placeholder = t(
    'command.context-restoration.sources.placeholder'
  )
  main_quick_pick.buttons = [
    { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
  ]

  const last_main_selection_value =
    params.extension_context.workspaceState.get<string>(
      LAST_APPLY_CONTEXT_OPTION_STATE_KEY
    )
  if (last_main_selection_value) {
    const active_item = main_quick_pick_options.find(
      (opt) => opt.value === last_main_selection_value
    )
    if (active_item) {
      main_quick_pick.activeItems = [active_item]
    }
  }

  return new Promise((resolve) => {
    let is_accepted = false
    const disposables: vscode.Disposable[] = []
    disposables.push(
      main_quick_pick.onDidTriggerButton(() => {
        main_quick_pick.hide()
      }),
      main_quick_pick.onDidTriggerItemButton(async (e) => {
        if (e.button === open_file_button) {
          const workspace_folders = vscode.workspace.workspaceFolders
          if (!workspace_folders || workspace_folders.length == 0) return

          let file_path: string | undefined
          if (workspace_folders.length == 1) {
            file_path = get_contexts_file_path(workspace_folders[0].uri.fsPath)
          } else {
            const picked = await vscode.window.showQuickPick(
              workspace_folders.map((f) => ({
                label: f.name,
                folder: f
              })),
              { placeHolder: 'Select workspace folder' }
            )
            if (picked) {
              file_path = get_contexts_file_path(picked.folder.uri.fsPath)
            }
          }

          if (file_path) {
            if (!fs.existsSync(file_path)) {
              try {
                const dir = path.dirname(file_path)
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
                fs.writeFileSync(file_path, '[]', 'utf8')
              } catch (error) {
                vscode.window.showErrorMessage(
                  `Failed to create context file: ${error}`
                )
                return
              }
            }
            const doc = await vscode.workspace.openTextDocument(file_path)
            await vscode.window.showTextDocument(doc)
            main_quick_pick.hide()
          }
        }
      }),
      main_quick_pick.onDidAccept(async () => {
        is_accepted = true
        const selected = main_quick_pick.selectedItems[0]
        main_quick_pick.hide()
        if (selected) {
          await params.extension_context.workspaceState.update(
            LAST_APPLY_CONTEXT_OPTION_STATE_KEY,
            selected.value
          )
          resolve(selected.value)
        } else {
          resolve(undefined)
        }
      }),
      main_quick_pick.onDidHide(() => {
        if (!is_accepted) resolve(undefined)
        disposables.forEach((d) => d.dispose())
        main_quick_pick.dispose()
      })
    )
    main_quick_pick.show()
  })
}
