import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { display_token_count } from '@/utils/display-token-count'
import { t } from '@/i18n'
import { create_search_regex } from './create-search-regex'

export const prompt_for_search_results = async (params: {
  matched_files: string[]
  search_term: string
  search_mode: 'phrase' | 'keywords' | 'filename' | 'intelligent' | 'semantic'
  workspace_provider: WorkspaceProvider
}): Promise<
  | { selected_paths: string[]; matched_paths: string[] }
  | undefined
  | 'back'
  | 'intelligent'
> => {
  const open_file_button = {
    iconPath: new vscode.ThemeIcon('go-to-file'),
    tooltip: t('common.go-to-file')
  }
  const intelligent_search_button = {
    iconPath: new vscode.ThemeIcon('search-sparkle'),
    tooltip: t('feature.search-files.mode.intelligent')
  }
  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  const currently_checked = params.workspace_provider.get_checked_files()

  const quick_pick_items = await Promise.all(
    params.matched_files.map(async (file_path) => {
      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path)
      const relative_path = workspace_root
        ? path.relative(workspace_root, file_path)
        : file_path

      const dir_name = path.dirname(relative_path)
      let display_dir = dir_name == '.' ? '' : dir_name

      if (
        workspace_root &&
        params.workspace_provider.get_workspace_roots().length > 1
      ) {
        const workspace_name =
          params.workspace_provider.get_workspace_name(workspace_root)
        display_dir = display_dir
          ? `${workspace_name}/${display_dir}`
          : workspace_name
      }

      const token_count =
        await params.workspace_provider.calculate_file_tokens(file_path)
      const formatted_token_count = display_token_count(token_count.total)

      return {
        label: path.basename(file_path),
        description: display_dir
          ? `${formatted_token_count} · ${display_dir}`
          : formatted_token_count,
        file_path,
        buttons: [open_file_button]
      }
    })
  )

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { file_path: string }
  >()
  quick_pick.items = quick_pick_items
  quick_pick.selectedItems = quick_pick_items.filter((item) =>
    currently_checked.includes(item.file_path)
  )
  quick_pick.canSelectMany = true
  quick_pick.matchOnDescription = true
  quick_pick.placeholder = t('feature.search-files.select-files')

  quick_pick.title =
    params.search_mode == 'keywords'
      ? t('feature.search-files.results.keywords')
      : params.search_mode == 'filename'
        ? t('feature.search-files.results.filename')
        : params.search_mode == 'intelligent'
          ? t('feature.search-files.results.intelligent')
          : params.search_mode == 'semantic'
            ? t('feature.search-files.results.semantic')
            : t('feature.search-files.results.phrase')

  quick_pick.ignoreFocusOut = true
  quick_pick.buttons = [
    vscode.QuickInputButtons.Back,
    intelligent_search_button,
    close_button
  ]

  return new Promise<
    | { selected_paths: string[]; matched_paths: string[] }
    | undefined
    | 'back'
    | 'intelligent'
  >((resolve) => {
    let is_accepted = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        resolve('back')
        quick_pick.hide()
      } else if (button === close_button) {
        resolve(undefined)
        quick_pick.hide()
      } else if (button === intelligent_search_button) {
        resolve('intelligent')
        quick_pick.hide()
      }
    })

    quick_pick.onDidAccept(() => {
      is_accepted = true
      resolve({
        selected_paths: quick_pick.selectedItems.map((item) => item.file_path),
        matched_paths: params.matched_files
      })
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
          const doc = await vscode.workspace.openTextDocument(e.item.file_path)

          const text = doc.getText()

          let regexes: RegExp[] = []
          if (params.search_mode == 'keywords') {
            regexes = params.search_term
              .split(',')
              .map((k) => k.trim())
              .filter((k) => k.length > 0 && !k.startsWith('!'))
              .map((k) => create_search_regex(k))
          } else if (
            params.search_mode == 'filename' ||
            params.search_mode == 'semantic'
          ) {
            regexes = []
          } else {
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
      }
    })

    quick_pick.show()
  })
}
