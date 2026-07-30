import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { display_token_count } from '@/utils/display-token-count'
import { t } from '@/i18n'
import { create_search_regex } from './create-search-regex'
import { show_parent_folder_quick_pick } from '@/utils/show-parent-folder-quick-pick'

export const prompt_for_search_results = async (params: {
  matched_files: string[]
  search_term: string
  search_mode: 'phrase' | 'keywords' | 'intelligent' | 'semantic'
  keywords_target?: 'contents' | 'filenames' | 'both'
  workspace_provider: WorkspaceProvider
}): Promise<
  | { selected_paths: string[]; matched_paths: string[] }
  | { action: 'search_in_results'; matched_paths: string[] }
  | undefined
  | 'back'
> => {
  const open_file_button = {
    iconPath: new vscode.ThemeIcon('go-to-file'),
    tooltip: t('common.go-to-file')
  }
  const add_parent_folder_button = {
    iconPath: new vscode.ThemeIcon('folder'),
    tooltip: t('common.select-parent-folder')
  }
  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }
  const search_in_results_button = {
    iconPath: new vscode.ThemeIcon('search'),
    tooltip: t('common.search-in-results')
  }

  const currently_checked = params.workspace_provider.get_checked_files()
  const is_multi_root =
    params.workspace_provider.get_workspace_roots().length > 1

  const mapped_items = await Promise.all(
    params.matched_files.map(async (file_path) => {
      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path)
      const relative_path = workspace_root
        ? path.relative(workspace_root, file_path)
        : file_path

      const dir_name = path.dirname(relative_path)
      const has_parent_folder = dir_name != '.'
      const display_dir = dir_name == '.' ? '' : dir_name

      let workspace_name = ''
      if (workspace_root && is_multi_root) {
        workspace_name =
          params.workspace_provider.get_workspace_name(workspace_root)
      }

      const token_count =
        await params.workspace_provider.calculate_file_tokens(file_path)
      const formatted_token_count = display_token_count(token_count.total)

      const buttons: vscode.QuickInputButton[] = []
      if (has_parent_folder) {
        buttons.push(add_parent_folder_button)
      }
      buttons.push(open_file_button)

      return {
        label: path.basename(file_path),
        description: display_dir
          ? `${formatted_token_count} · ${display_dir}`
          : formatted_token_count,
        file_path,
        workspace_name,
        buttons
      }
    })
  )

  const quick_pick_items: (vscode.QuickPickItem & { file_path?: string })[] = []

  if (is_multi_root) {
    const grouped = new Map<string, typeof mapped_items>()
    for (const item of mapped_items) {
      const ws = item.workspace_name
      if (!ws) continue
      if (!grouped.has(ws)) grouped.set(ws, [])
      grouped.get(ws)!.push(item)
    }

    const ordered_workspaces = params.workspace_provider
      .get_workspace_roots()
      .map((root) => params.workspace_provider.get_workspace_name(root))

    const unique_ordered_workspaces = Array.from(new Set(ordered_workspaces))

    for (const ws of unique_ordered_workspaces) {
      if (grouped.has(ws)) {
        quick_pick_items.push({
          label: ws,
          kind: vscode.QuickPickItemKind.Separator
        })
        quick_pick_items.push(...grouped.get(ws)!)
      }
    }
  } else {
    quick_pick_items.push(...mapped_items)
  }

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { file_path?: string }
  >()
  quick_pick.items = quick_pick_items
  quick_pick.selectedItems = quick_pick_items.filter(
    (item) => item.file_path && currently_checked.includes(item.file_path)
  )
  quick_pick.canSelectMany = true
  quick_pick.matchOnDescription = true
  quick_pick.placeholder = t('feature.search-files.select-files')

  quick_pick.title =
    params.search_mode == 'keywords'
      ? params.keywords_target == 'filenames'
        ? t('feature.search-files.results.filename')
        : t('feature.search-files.results.keywords')
      : params.search_mode == 'intelligent'
        ? t('feature.search-files.results.intelligent')
        : params.search_mode == 'semantic'
          ? t('feature.search-files.results.semantic')
          : t('feature.search-files.results.phrase')

  quick_pick.ignoreFocusOut = true
  quick_pick.buttons = [
    vscode.QuickInputButtons.Back,
    search_in_results_button,
    close_button
  ]

  let is_showing_folder_quick_pick = false

  return new Promise<
    | { selected_paths: string[]; matched_paths: string[] }
    | { action: 'search_in_results'; matched_paths: string[] }
    | undefined
    | 'back'
  >((resolve) => {
    let is_accepted = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        resolve('back')
        quick_pick.hide()
      } else if (button === search_in_results_button) {
        is_accepted = true
        resolve({
          action: 'search_in_results',
          matched_paths: params.matched_files
        })
        quick_pick.hide()
      } else if (button === close_button) {
        resolve(undefined)
        quick_pick.hide()
      }
    })

    quick_pick.onDidAccept(() => {
      is_accepted = true
      resolve({
        selected_paths: quick_pick.selectedItems
          .map((item) => item.file_path)
          .filter((p): p is string => p !== undefined),
        matched_paths: params.matched_files
      })
      quick_pick.hide()
    })

    quick_pick.onDidHide(() => {
      if (is_showing_folder_quick_pick) return
      if (!is_accepted) {
        resolve(undefined)
      }
      quick_pick.dispose()
    })

    quick_pick.onDidTriggerItemButton(async (e) => {
      if (!e.item.file_path) return
      if (e.button === open_file_button) {
        try {
          const doc = await vscode.workspace.openTextDocument(e.item.file_path)

          const text = doc.getText()

          let regexes: RegExp[] = []
          if (params.search_mode == 'phrase') {
            regexes = [create_search_regex(params.search_term)]
          }

          let selection: vscode.Range | undefined
          for (const regex of regexes) {
            const match = regex.exec(text)
            if (match) {
              const start_pos = doc.positionAt(match.index)
              const end_pos = doc.positionAt(match.index + match[0].length)
              selection = new vscode.Range(start_pos, end_pos)
              break
            }
          }

          await vscode.window.showTextDocument(doc, {
            preview: true,
            selection
          })
        } catch (error) {
          vscode.window.showErrorMessage(
            t('feature.search-files.error.opening-file', {
              error: String(error)
            })
          )
        }
      } else if (e.button === add_parent_folder_button) {
        is_showing_folder_quick_pick = true
        quick_pick.hide()

        const result = await show_parent_folder_quick_pick({
          file_path: e.item.file_path,
          workspace_provider: params.workspace_provider
        })

        is_showing_folder_quick_pick = false

        if (
          result === 'added' ||
          result === 'back' ||
          result === 'no_folders' ||
          result === 'no_workspace_root'
        ) {
          const current_items = quick_pick.items
          let current_selected = quick_pick.selectedItems

          if (result === 'added') {
            const currently_checked =
              params.workspace_provider.get_checked_files()
            current_selected = current_items.filter(
              (item) =>
                (item.file_path &&
                  currently_checked.includes(item.file_path)) ||
                current_selected.includes(item)
            )
          }

          quick_pick.items = [...current_items]
          quick_pick.selectedItems = current_selected
          quick_pick.show()

          setTimeout(() => {
            quick_pick.activeItems = [e.item]
          }, 0)
        } else {
          is_accepted = true
          resolve(undefined)
          quick_pick.dispose()
        }
      }
    })

    quick_pick.show()
  })
}
