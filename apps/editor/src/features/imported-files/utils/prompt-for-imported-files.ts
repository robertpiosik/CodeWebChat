import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { display_token_count } from '@/utils/display-token-count'
import { is_valid_uri } from './is-valid-uri'
import { get_imports_for_uri } from './get-imports-for-uri'
import { t } from '@/i18n'
import { search_files } from '@/features/search-files'
import { show_parent_folder_quick_pick } from '@/utils/show-parent-folder-quick-pick'
import { WebSocketManager } from '@/services/websocket-manager'

export const prompt_for_imported_files = async (params: {
  starting_uris: vscode.Uri[]
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
}): Promise<
  { selected_paths: string[]; shown_paths: string[] } | undefined
> => {
  const {
    starting_uris,
    workspace_provider,
    extension_context,
    websocket_manager
  } = params

  const immediate_uris = new Set<string>()
  const recursive_uris = new Set<string>()
  const visited_uris = new Set<string>(starting_uris.map((u) => u.toString()))

  let is_cancelled = false
  const queue: vscode.Uri[] = []

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: t('feature.imported-files.processing'),
      cancellable: true
    },
    async (progress, token) => {
      let processed = 0
      const total = starting_uris.length
      let last_reported_percentage = 0

      for (const starting_uri of starting_uris) {
        if (token.isCancellationRequested) {
          is_cancelled = true
          break
        }

        const current_percentage = Math.floor((processed / total) * 100)
        const increment = Math.max(
          0,
          current_percentage - last_reported_percentage
        )
        last_reported_percentage += increment

        progress.report({
          increment
        })

        const imports = await get_imports_for_uri(starting_uri, token)
        for (const uri_str of imports) {
          if (!visited_uris.has(uri_str)) {
            visited_uris.add(uri_str)
            if (is_valid_uri(uri_str, workspace_provider)) {
              immediate_uris.add(uri_str)
              queue.push(vscode.Uri.parse(uri_str))
            }
          }
        }
        processed++
      }

      if (!is_cancelled) {
        progress.report({
          increment: 100 - last_reported_percentage
        })
      }
    }
  )

  if (is_cancelled) {
    return undefined
  }

  const initial_visited_uris = new Set(visited_uris)
  const initial_queue = [...queue]

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

  const search_button = {
    iconPath: new vscode.ThemeIcon('search'),
    tooltip: t('feature.imported-files.search')
  }

  const deep_search_button = {
    iconPath: new vscode.ThemeIcon('telescope'),
    tooltip: t('feature.imported-files.deep-search')
  }

  type ImportQuickPickItem = vscode.QuickPickItem & {
    uri?: vscode.Uri
    picked?: boolean
    tokens?: number
  }

  const map_to_quick_pick = async (
    uris: vscode.Uri[]
  ): Promise<ImportQuickPickItem[]> => {
    return Promise.all(
      uris.map(async (uri) => {
        const file_path = uri.fsPath
        const workspace_root =
          workspace_provider.get_workspace_root_for_file(file_path)!
        const relative_path = path.relative(workspace_root, file_path)
        const dir_name = path.dirname(relative_path)
        const has_parent_folder = dir_name != '.'
        let display_dir = dir_name == '.' ? '' : dir_name

        if (workspace_provider.get_workspace_roots().length > 1) {
          const workspace_name =
            workspace_provider.get_workspace_name(workspace_root)
          display_dir = display_dir
            ? `${workspace_name}/${display_dir}`
            : workspace_name
        }

        const token_count =
          await workspace_provider.calculate_file_tokens(file_path)
        const formatted_token_count = display_token_count(token_count.total)

        const current_checked = workspace_provider.get_checked_files()
        const is_picked = current_checked.includes(file_path)

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
          picked: is_picked,
          uri: uri,
          tokens: token_count.total,
          buttons
        }
      })
    )
  }

  let current_selected_items: ImportQuickPickItem[] = []
  let selected_paths: string[] = []
  let shown_paths: string[] = []
  let first_render = true

  while (true) {
    const valid_immediate = Array.from(immediate_uris).map((u) =>
      vscode.Uri.parse(u)
    )
    const valid_recursive = Array.from(recursive_uris).map((u) =>
      vscode.Uri.parse(u)
    )

    if (valid_immediate.length == 0 && valid_recursive.length == 0) {
      vscode.window.showInformationMessage(t('feature.imported-files.no-files'))
      return undefined
    }

    const quick_pick_items: ImportQuickPickItem[] = []

    if (valid_immediate.length > 0) {
      if (valid_recursive.length > 0) {
        quick_pick_items.push({
          label: t('feature.imported-files.immediate'),
          kind: vscode.QuickPickItemKind.Separator
        })
      }
      const immediate_items = await map_to_quick_pick(valid_immediate)
      quick_pick_items.push(...immediate_items)
    }

    if (valid_recursive.length > 0) {
      quick_pick_items.push({
        label: t('feature.imported-files.recursive'),
        kind: vscode.QuickPickItemKind.Separator
      })
      const recursive_items = await map_to_quick_pick(valid_recursive)
      quick_pick_items.push(...recursive_items)
    }

    if (first_render) {
      current_selected_items = quick_pick_items.filter((item) => item.picked)
      first_render = false
    } else {
      const selected_uris = new Set(
        current_selected_items
          .filter((i) => i.uri)
          .map((i) => i.uri!.toString())
      )
      current_selected_items = quick_pick_items.filter(
        (item) => item.uri && selected_uris.has(item.uri.toString())
      )
    }

    shown_paths = quick_pick_items
      .filter(
        (item) => item.kind !== vscode.QuickPickItemKind.Separator && item.uri
      )
      .map((item) => item.uri!.fsPath)

    const quick_pick = vscode.window.createQuickPick<ImportQuickPickItem>()
    quick_pick.items = quick_pick_items
    quick_pick.selectedItems = current_selected_items
    quick_pick.canSelectMany = true
    quick_pick.matchOnDescription = true

    const update_placeholder = () => {
      const total = quick_pick.selectedItems.reduce(
        (sum, item) => sum + (item.tokens || 0),
        0
      )

      if (total > 0) {
        quick_pick.placeholder = t(
          'feature.imported-files.placeholder-tokens',
          { tokens: display_token_count(total) }
        )
      } else {
        quick_pick.placeholder = t('feature.imported-files.placeholder')
      }
    }
    update_placeholder()
    quick_pick.onDidChangeSelection(update_placeholder)

    quick_pick.title = t('feature.imported-files.title')
    quick_pick.ignoreFocusOut = true

    const buttons: vscode.QuickInputButton[] = [search_button, close_button]
    if (queue.length > 0) {
      buttons.unshift(deep_search_button)
    }
    if (valid_recursive.length > 0) {
      buttons.unshift(vscode.QuickInputButtons.Back)
    }
    quick_pick.buttons = buttons

    let is_showing_folder_quick_pick = false
    const selected_items = await new Promise<
      | readonly ImportQuickPickItem[]
      | undefined
      | 'search'
      | 'deep_search'
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
        } else if (button === search_button) {
          current_selected_items = [...quick_pick.selectedItems]
          resolve('search')
          quick_pick.hide()
        } else if (button === deep_search_button) {
          current_selected_items = [...quick_pick.selectedItems]
          resolve('deep_search')
          quick_pick.hide()
        }
      })

      quick_pick.onDidAccept(() => {
        is_accepted = true
        resolve(quick_pick.selectedItems)
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
        if (e.button === open_file_button && e.item.uri) {
          try {
            const doc = await vscode.workspace.openTextDocument(e.item.uri)
            await vscode.window.showTextDocument(doc, { preview: true })
          } catch (error) {
            vscode.window.showErrorMessage(
              t('feature.imported-files.error-opening', {
                error: String(error)
              })
            )
          }
        } else if (e.button === add_parent_folder_button && e.item.uri) {
          is_showing_folder_quick_pick = true
          quick_pick.hide()

          const result = await show_parent_folder_quick_pick({
            file_path: e.item.uri.fsPath,
            workspace_provider
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
              const updated_checked = workspace_provider.get_checked_files()
              current_selected = current_items.filter(
                (item) =>
                  (item.uri && updated_checked.includes(item.uri.fsPath)) ||
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

    if (selected_items === undefined) {
      return undefined
    }

    if (selected_items === 'back') {
      recursive_uris.clear()
      visited_uris.clear()
      initial_visited_uris.forEach((u) => visited_uris.add(u))
      queue.length = 0
      for (const item of initial_queue) {
        queue.push(item)
      }
      continue
    }

    if (selected_items === 'deep_search') {
      is_cancelled = false
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t('feature.imported-files.processing-recursive'),
          cancellable: true
        },
        async (progress, token) => {
          let processed = 0
          let total = queue.length
          let last_reported_percentage = 0

          while (queue.length > 0) {
            if (token.isCancellationRequested) {
              is_cancelled = true
              break
            }
            const current_uri = queue.shift()!

            const current_percentage = Math.floor((processed / total) * 100)
            const increment = Math.max(
              0,
              current_percentage - last_reported_percentage
            )
            last_reported_percentage += increment

            progress.report({
              increment
            })

            const imports = await get_imports_for_uri(current_uri, token)
            for (const uri_str of imports) {
              if (!visited_uris.has(uri_str)) {
                visited_uris.add(uri_str)
                if (is_valid_uri(uri_str, workspace_provider)) {
                  recursive_uris.add(uri_str)
                  queue.push(vscode.Uri.parse(uri_str))
                  total++
                }
              }
            }
            processed++
          }

          if (!is_cancelled) {
            progress.report({
              increment: 100 - last_reported_percentage
            })
          }
        }
      )

      continue
    }

    if (selected_items == 'search') {
      const search_result = await search_files({
        get_files: async () => shown_paths,
        workspace_provider,
        extension_context,
        websocket_manager,
        show_back_button: true,
        disable_semantic: true
      })

      if (search_result == 'back') {
        continue
      }

      if (!search_result) {
        return undefined
      }

      selected_paths = search_result.selected_paths
      break
    } else {
      const valid_selected = selected_items.filter((i) => i.uri !== undefined)
      selected_paths = valid_selected.map((item) => item.uri!.fsPath)
      break
    }
  }

  return { selected_paths, shown_paths }
}
