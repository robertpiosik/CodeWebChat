import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'
import { search_files } from '@/features/search-files'
import { LAST_FIND_RELEVANT_FILES_MERGE_REPLACE_OPTION_STATE_KEY } from '@/constants/state-keys'

export const get_target_folder_path = async (
  item?: any
): Promise<string | undefined> => {
  let folder_path = item?.resourceUri?.fsPath
  if (folder_path) {
    try {
      const stats = await fs.promises.stat(folder_path)
      if (!stats.isDirectory()) {
        folder_path = path.dirname(folder_path)
      }
    } catch (error) {
      folder_path = undefined
    }
  }
  return folder_path
}

export const search_files_commands = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  const search_handler = async (item?: any) => {
    const folder_path = await get_target_folder_path(item)

    let all_files: string[] = []

    if (folder_path) {
      all_files = await workspace_provider.find_all_files(folder_path)
    } else {
      const roots = workspace_provider.get_workspace_roots()
      for (const root of roots) {
        const files = await workspace_provider.find_all_files(root)
        all_files.push(...files)
      }
    }

    const result = await search_files({
      files: all_files,
      workspace_provider,
      extension_context
    })

    if (!result || result == 'back') return

    const { selected_paths, matched_paths } = result

    const unchecked_paths = matched_paths.filter(
      (file_path) => !selected_paths.includes(file_path)
    )

    const currently_checked = workspace_provider.get_checked_files()
    const currently_checked_in_folder = currently_checked.filter((f) =>
      all_files.includes(f)
    )

    let paths_to_apply: string[] = []

    if (currently_checked_in_folder.length > 0) {
      const selected_paths_set = new Set(selected_paths)
      const is_identical =
        currently_checked_in_folder.length == selected_paths_set.size &&
        currently_checked_in_folder.every((file) =>
          selected_paths_set.has(file)
        )

      if (is_identical) {
        vscode.window.showInformationMessage(
          dictionary.information_message.CONTEXT_ALREADY_SET
        )
        return
      }

      const quick_pick_options = [
        {
          label: t('command.search.replace'),
          description: t('command.search.replace-description')
        },
        {
          label: t('command.search.merge'),
          description: t('command.search.merge-description')
        }
      ]

      const last_choice_label = extension_context.workspaceState.get<string>(
        LAST_FIND_RELEVANT_FILES_MERGE_REPLACE_OPTION_STATE_KEY
      )

      const quick_pick_merge = vscode.window.createQuickPick()
      quick_pick_merge.items = quick_pick_options
      quick_pick_merge.placeholder = t('command.search.apply-placeholder', {
        count: selected_paths.length
      })
      quick_pick_merge.buttons = [vscode.QuickInputButtons.Back]

      if (last_choice_label) {
        const active_item = quick_pick_options.find(
          (opt) => opt.label === last_choice_label
        )
        if (active_item) {
          quick_pick_merge.activeItems = [active_item]
        }
      }

      const choice = await new Promise<
        vscode.QuickPickItem | 'back' | undefined
      >((resolve_choice) => {
        let is_accepted = false
        quick_pick_merge.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            resolve_choice('back')
            quick_pick_merge.hide()
          }
        })
        quick_pick_merge.onDidAccept(() => {
          is_accepted = true
          resolve_choice(quick_pick_merge.selectedItems[0])
          quick_pick_merge.hide()
        })
        quick_pick_merge.onDidHide(() => {
          if (!is_accepted) resolve_choice(undefined)
          quick_pick_merge.dispose()
        })
        quick_pick_merge.show()
      })

      if (choice == 'back' || !choice) {
        return
      }

      await extension_context.workspaceState.update(
        LAST_FIND_RELEVANT_FILES_MERGE_REPLACE_OPTION_STATE_KEY,
        choice.label
      )

      if (choice.label == t('command.search.merge')) {
        paths_to_apply = [
          ...new Set([
            ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
            ...selected_paths
          ])
        ]
      } else {
        paths_to_apply = [
          ...new Set([
            ...currently_checked.filter((p) => !all_files.includes(p)),
            ...selected_paths
          ])
        ]
      }
    } else {
      paths_to_apply = [...new Set([...currently_checked, ...selected_paths])]
    }

    await workspace_provider.set_checked_files(paths_to_apply)

    Logger.info({
      message: `Selected ${selected_paths.length} files from search.`,
      data: { paths: selected_paths, folder: folder_path }
    })

    const newly_selected_count = selected_paths.filter(
      (p) => !currently_checked.includes(p)
    ).length

    if (newly_selected_count > 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.ADDED_FILES_TO_CONTEXT(
          newly_selected_count
        )
      )
    } else {
      vscode.window.showInformationMessage(t('command.search.success.added'))
    }
  }

  return [
    vscode.commands.registerCommand('codeWebChat.searchFiles', () =>
      search_handler()
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesFromDirectory',
      (item: any) => search_handler(item)
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesFromFile',
      (item: any) => search_handler(item)
    )
  ]
}
