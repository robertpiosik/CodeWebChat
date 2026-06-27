import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import {
  load_and_merge_global_contexts,
  save_contexts_for_workspace,
  load_contexts_for_workspace
} from '../utils/global-storage-utils'
import { group_files_by_workspace, condense_paths } from '../utils/path-utils'
import { ask_for_new_context_name } from '../utils/ask-for-new-context-name'
import { resolve_unique_context_name } from '../utils/context-file-utils'
import { t } from '@/i18n'
import { dictionary } from '@shared/constants/dictionary'
import { create_context_description } from '../utils/create-context-description'

export const save_to_workspace_state = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
}): Promise<'back' | void> => {
  const { merged: internal_contexts, context_to_roots } =
    load_and_merge_global_contexts(params.extension_context)
  const LABEL_SAVE_NEW_CONTEXT = t(
    'command.apply-context.save-new-context.label'
  )

  while (true) {
    const items: any[] = []
    items.push({ label: LABEL_SAVE_NEW_CONTEXT })

    if (internal_contexts.length > 0) {
      items.push({
        label: t('command.apply-context.recent-entries'),
        kind: vscode.QuickPickItemKind.Separator
      })
      for (const context of internal_contexts) {
        const roots = context_to_roots.get(context.name) || []
        const { description } = await create_context_description({
          context,
          workspace_provider: params.workspace_provider,
          roots
        })

        items.push({
          label: context.name,
          description,
          context
        })
      }
    }

    const quick_pick = vscode.window.createQuickPick<any>()
    quick_pick.title = t('command.apply-context.select-saved.title')
    quick_pick.placeholder = 'Select a context to overwrite or create a new one'
    quick_pick.items = items
    quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const selection = await new Promise<any>((resolve) => {
      quick_pick.onDidTriggerButton((btn) => {
        if (btn === vscode.QuickInputButtons.Back) resolve('back')
      })
      quick_pick.onDidAccept(() => resolve(quick_pick.selectedItems[0]))
      quick_pick.onDidHide(() => resolve(undefined))
      quick_pick.show()
    })

    quick_pick.dispose()

    if (!selection) return
    if (selection === 'back') return 'back'

    const checked_files = params.workspace_provider.get_checked_files()
    const files_by_workspace = group_files_by_workspace(checked_files)

    if (selection.label === LABEL_SAVE_NEW_CONTEXT) {
      const name = await ask_for_new_context_name(true)
      if (!name || name === 'back') continue

      const unique_name = resolve_unique_context_name({
        base_name: name,
        existing_names: internal_contexts.map((c) => c.name)
      })

      for (const [root, files] of files_by_workspace.entries()) {
        if (files.length === 0) continue
        const condensed_paths = condense_paths({
          paths: files,
          workspace_root: root,
          workspace_provider: params.workspace_provider
        })
        const relative_paths = condensed_paths.map((p) => p.replace(/\\/g, '/'))

        const root_contexts = load_contexts_for_workspace({
          context: params.extension_context,
          workspace_root: root
        })
        root_contexts.unshift({ name: unique_name, paths: relative_paths })
        save_contexts_for_workspace({
          context: params.extension_context,
          workspace_root: root,
          contexts: root_contexts
        })
      }

      vscode.window.showInformationMessage(
        dictionary.information_message.CONTEXT_SAVED_SUCCESSFULLY
      )
      return
    }

    if (selection.context) {
      const context_name = selection.context.name
      const choice = await vscode.window.showWarningMessage(
        t('command.context-selection.overwrite.prompt', { name: context_name }),
        { modal: true },
        t('command.context-selection.overwrite.action')
      )

      if (choice === t('command.context-selection.overwrite.action')) {
        const current_roots = context_to_roots.get(context_name) || []
        const all_roots = new Set([
          ...current_roots,
          ...files_by_workspace.keys()
        ])

        for (const root of all_roots) {
          let root_contexts = load_contexts_for_workspace({
            context: params.extension_context,
            workspace_root: root
          })
          root_contexts = root_contexts.filter((c) => c.name !== context_name)

          const files = files_by_workspace.get(root)
          if ((files && files.length > 0) || current_roots.includes(root)) {
            let relative_paths: string[] = []
            if (files && files.length > 0) {
              const condensed_paths = condense_paths({
                paths: files,
                workspace_root: root,
                workspace_provider: params.workspace_provider
              })
              relative_paths = condensed_paths.map((p) => p.replace(/\\/g, '/'))
            }
            root_contexts.unshift({ name: context_name, paths: relative_paths })
          }
          save_contexts_for_workspace({
            context: params.extension_context,
            workspace_root: root,
            contexts: root_contexts
          })
        }

        vscode.window.showInformationMessage(
          dictionary.information_message.CONTEXT_UPDATED_SUCCESSFULLY
        )
        return
      } else {
        continue
      }
    }
  }
}
