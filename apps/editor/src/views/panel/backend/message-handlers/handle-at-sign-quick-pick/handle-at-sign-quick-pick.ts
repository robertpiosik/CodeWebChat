import fs from 'fs'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { natural_sort } from '@/utils/natural-sort'

type QuickPickItem = {
  label: string
  description: string
  full_path: string
  absolute_path: string
}

const add_to_context_if_needed = async (
  workspace_provider: WorkspaceProvider,
  file_path: string
) => {
  const current_checked = workspace_provider.get_checked_files()
  if (!current_checked.includes(file_path)) {
    await workspace_provider.set_checked_files([...current_checked, file_path])
  }
}

const browse_all_files = async (
  workspace_provider: WorkspaceProvider,
  workspace_roots: string[],
  format_path: (p: string) => string,
  show_back_button: boolean = true
): Promise<QuickPickItem | 'back' | undefined> => {
  const quick_pick = vscode.window.createQuickPick<QuickPickItem>()
  quick_pick.placeholder = 'Select a file'
  quick_pick.title = 'All Files'
  if (show_back_button) {
    quick_pick.buttons = [vscode.QuickInputButtons.Back]
  } else {
    quick_pick.buttons = [
      { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
    ]
  }
  quick_pick.matchOnDescription = true
  quick_pick.busy = true
  quick_pick.show()

  try {
    const all_files: string[] = []
    for (const root of workspace_roots) {
      const files = await workspace_provider.find_all_files(root)
      all_files.push(...files)
    }

    const items: QuickPickItem[] = all_files.map((p) => {
      const normalized_path = format_path(p)
      const filename = path.basename(normalized_path)
      const dir_path = path.dirname(normalized_path)

      return {
        label: filename,
        description: dir_path == '.' ? '' : dir_path,
        full_path: normalized_path,
        absolute_path: p
      }
    })

    items.sort((a, b) => {
      const label_diff = natural_sort(a.label, b.label)
      if (label_diff != 0) return label_diff
      return natural_sort(a.description || '', b.description || '')
    })

    quick_pick.items = items
    quick_pick.busy = false
  } catch (e) {
    console.error(e)
  }

  return new Promise<QuickPickItem | 'back' | undefined>((resolve) => {
    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        resolve('back')
      }
      quick_pick.hide()
    })

    quick_pick.onDidAccept(() => {
      resolve(quick_pick.selectedItems[0])
      quick_pick.hide()
    })
    quick_pick.onDidHide(() => {
      resolve('back')
      quick_pick.dispose()
    })
  })
}

const at_sign_quick_pick = async (params: {
  workspace_provider: WorkspaceProvider
}): Promise<string | undefined> => {
  const workspace_roots = params.workspace_provider.get_workspace_roots()

  const format_path = (p: string) => {
    let relative_path = p
    const root = params.workspace_provider.get_workspace_root_for_file(p)
    if (root) {
      if (workspace_roots.length > 1) {
        const ws_name = params.workspace_provider.get_workspace_name(root)
        relative_path = path.join(ws_name, path.relative(root, p))
      } else {
        relative_path = path.relative(root, p)
      }
    }
    return relative_path.replace(/\\/g, '/')
  }

  const checked_paths = params.workspace_provider.get_all_checked_paths()

  if (checked_paths.length == 0) {
    const browsed_item = await browse_all_files(
      params.workspace_provider,
      workspace_roots,
      format_path,
      false
    )
    if (browsed_item && browsed_item != 'back') {
      await add_to_context_if_needed(
        params.workspace_provider,
        browsed_item.absolute_path
      )
      return `\`${browsed_item.full_path}\``
    }
    return
  }

  let selected_path_item: QuickPickItem | undefined

  while (true) {
    const all_quick_pick_items: QuickPickItem[] = checked_paths
      .filter((p) => {
        try {
          return fs.existsSync(p) && fs.statSync(p).isFile()
        } catch {
          return false
        }
      })
      .map((p) => {
        const normalized_path = format_path(p)
        const filename = path.basename(normalized_path)
        const dir_path = path.dirname(normalized_path)

        return {
          label: filename,
          description: dir_path == '.' ? '' : dir_path,
          full_path: normalized_path,
          absolute_path: p
        }
      })

    all_quick_pick_items.sort((a, b) => natural_sort(a.full_path, b.full_path))

    const browse_item: QuickPickItem = {
      label: 'Browse all files',
      description: '',
      full_path: 'BROWSE_ALL_FILES',
      absolute_path: ''
    }

    const separator_item = {
      label: 'files in context',
      kind: vscode.QuickPickItemKind.Separator
    } as any

    const quick_pick_items_to_show = [
      browse_item,
      separator_item,
      ...all_quick_pick_items
    ]

    const quick_pick = vscode.window.createQuickPick<QuickPickItem>()
    quick_pick.items = quick_pick_items_to_show
    quick_pick.placeholder = 'Select a path to place in the prompt field'
    quick_pick.matchOnDescription = true
    quick_pick.title = 'Workspace Files'
    quick_pick.buttons = [
      { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
    ]

    const choice = await new Promise<QuickPickItem | undefined>((resolve) => {
      let is_accepted = false
      let is_browse_visible = true
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton((_button) => {
          quick_pick.hide()
        }),
        quick_pick.onDidChangeValue((value) => {
          if (value && is_browse_visible) {
            quick_pick.items = all_quick_pick_items
            is_browse_visible = false
          } else if (!value && !is_browse_visible) {
            quick_pick.items = quick_pick_items_to_show
            is_browse_visible = true
          }
        }),
        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          is_accepted = true
          resolve(selected)
          quick_pick.hide()
        }),
        quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve(undefined)
          }
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )
      quick_pick.show()
    })

    if (!choice) {
      selected_path_item = undefined
      break
    }

    if (choice.full_path == 'BROWSE_ALL_FILES') {
      const browsed_item = await browse_all_files(
        params.workspace_provider,
        workspace_roots,
        format_path,
        true
      )
      if (browsed_item == 'back') {
        continue // Go back to the main quick pick
      } else if (browsed_item) {
        await add_to_context_if_needed(
          params.workspace_provider,
          browsed_item.absolute_path
        )
        selected_path_item = browsed_item
        break
      } else {
        selected_path_item = undefined
        break
      }
    } else {
      selected_path_item = choice
      break
    }
  }

  if (selected_path_item) {
    return `\`${selected_path_item.full_path}\``
  }
  return
}

export const handle_at_sign_quick_pick = async (
  panel_provider: PanelProvider
): Promise<void> => {
  const replacement = await at_sign_quick_pick({
    workspace_provider: panel_provider.workspace_provider
  })

  if (!replacement) {
    panel_provider.send_message({
      command: 'FOCUS_PROMPT_FIELD'
    })
    return
  }

  const current_text = panel_provider.current_instruction

  const is_after_at_sign = current_text
    .slice(0, panel_provider.caret_position)
    .endsWith('@')
  if (is_after_at_sign) {
    panel_provider.add_text_at_cursor_position(replacement, 1)
  } else {
    panel_provider.add_text_at_cursor_position(replacement)
  }

  panel_provider.send_message({
    command: 'FOCUS_PROMPT_FIELD'
  })
}
