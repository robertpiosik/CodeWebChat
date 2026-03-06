import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../../context/providers/workspace/workspace-provider'
import { LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY } from '../../../../constants/state-keys'
import { SavedContext } from '@/types/context'
import { dictionary } from '@shared/constants/dictionary'
import { resolve_context_paths } from './resolve-context-paths'
import { t } from '@/i18n'

export const apply_saved_context = async (
  context: SavedContext,
  workspace_root: string,
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): Promise<'back' | void> => {
  const resolved_paths = await resolve_context_paths(
    context,
    workspace_root,
    workspace_provider
  )

  const existing_paths = resolved_paths

  if (existing_paths.length == 0) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.NO_VALID_PATHS_IN_CONTEXT(context.name)
    )
    return
  }

  let paths_to_apply = existing_paths
  const message = dictionary.information_message.CONTEXT_APPLIED_SUCCESSFULLY

  const currently_checked_files = workspace_provider.get_checked_files()
  if (currently_checked_files.length > 0) {
    const existing_paths_set = new Set(existing_paths)
    const is_identical =
      currently_checked_files.length == existing_paths_set.size &&
      currently_checked_files.every((file) => existing_paths_set.has(file))

    if (is_identical) {
      vscode.window.showInformationMessage(
        dictionary.information_message.CONTEXT_ALREADY_SET
      )
      return
    }

    if (!is_identical) {
      const quick_pick_options: (vscode.QuickPickItem & {
        action_id: string
      })[] = [
        {
          action_id: 'Replace',
          label: t('command.apply-context.action.replace.label'),
          description: t('command.apply-context.action.replace.description')
        },
        {
          action_id: 'Merge',
          label: t('command.apply-context.action.merge.label'),
          description: t('command.apply-context.action.merge.description')
        }
      ]

      const last_choice_label = extension_context.workspaceState.get<string>(
        LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY
      )

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = quick_pick_options
      quick_pick.placeholder = t('command.apply-context.apply.placeholder', {
        name: context.name
      })
      quick_pick.buttons = [vscode.QuickInputButtons.Back]

      if (last_choice_label) {
        const active_item = quick_pick_options.find(
          (opt) => opt.action_id === last_choice_label
        )
        if (active_item) {
          quick_pick.activeItems = [active_item]
        }
      }

      const choice = await new Promise<
        (vscode.QuickPickItem & { action_id: string }) | 'back' | undefined
      >((resolve) => {
        let is_accepted = false
        quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            resolve('back')
            quick_pick.hide()
          }
        })
        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(
            quick_pick.selectedItems[0] as vscode.QuickPickItem & {
              action_id: string
            }
          )
          quick_pick.hide()
        })
        quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve('back')
          }
          quick_pick.dispose()
        })
        quick_pick.show()
      })

      if (choice === 'back') {
        return 'back'
      }

      if (!choice) {
        return
      }

      await extension_context.workspaceState.update(
        LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY,
        choice.action_id
      )
      if (choice.action_id == 'Merge') {
        paths_to_apply = [
          ...new Set([...currently_checked_files, ...existing_paths])
        ]
      }
    }
  }

  await workspace_provider.set_checked_files(paths_to_apply)
  vscode.window.showInformationMessage(message)
}
