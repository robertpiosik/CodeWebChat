import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { display_token_count } from '../../../utils/display-token-count'
import { t } from '@/i18n'
import { create_search_regex } from './create-search-regex'

export const prompt_for_search_results = async (params: {
  matched_files: string[]
  search_term: string
  workspace_provider: WorkspaceProvider
}): Promise<
  readonly (vscode.QuickPickItem & { file_path: string })[] | undefined | 'back'
> => {
  const open_file_button = {
    iconPath: new vscode.ThemeIcon('go-to-file'),
    tooltip: t('common.go-to-file')
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
      const display_dir = dir_name === '.' ? '' : dir_name

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
  quick_pick.placeholder = t('command.search.select-files')
  quick_pick.title = t('command.search.results')
  quick_pick.ignoreFocusOut = true
  quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]

  return new Promise<
    | readonly (vscode.QuickPickItem & { file_path: string })[]
    | undefined
    | 'back'
  >((resolve) => {
    let is_accepted = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        resolve('back')
        quick_pick.hide()
      } else if (button === close_button) {
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
          const doc = await vscode.workspace.openTextDocument(e.item.file_path)

          const text = doc.getText()
          const regex = create_search_regex(params.search_term)
          const match = regex.exec(text)

          let selection: vscode.Range | undefined
          if (match) {
            const start_pos = doc.positionAt(match.index)
            const end_pos = doc.positionAt(match.index + match[0].length)
            selection = new vscode.Range(start_pos, end_pos)
          }

          await vscode.window.showTextDocument(doc, {
            preview: true,
            selection
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
}
