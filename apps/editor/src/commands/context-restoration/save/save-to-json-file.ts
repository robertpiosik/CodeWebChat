import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { load_and_merge_file_contexts } from '../utils/file-contexts'
import {
  get_contexts_file_path,
  load_contexts_from_file,
  save_contexts_to_file,
  resolve_unique_context_name
} from '../utils/context-file-utils'
import { group_files_by_workspace, condense_paths } from '../utils/path-utils'
import { ask_for_new_context_name } from '../utils/ask-for-new-context-name'
import { SavedContext } from '@/types/context'
import { t } from '@/i18n'
import { dictionary } from '@shared/constants/dictionary'
import { create_context_description } from '../utils/create-context-description'

export const save_to_json_file = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
}): Promise<'back' | void> => {
  const { merged: file_contexts, context_to_roots } =
    await load_and_merge_file_contexts()
  const LABEL_SAVE_NEW_CONTEXT = t(
    'command.context-restoration.save-new-context.label'
  )

  while (true) {
    const items: any[] = []
    items.push({ label: LABEL_SAVE_NEW_CONTEXT })

    if (file_contexts.length > 0) {
      items.push({
        label: t('command.context-restoration.entries-az'),
        kind: vscode.QuickPickItemKind.Separator
      })
      for (const context of file_contexts) {
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
    quick_pick.title = t('command.context-restoration.select-saved.title')
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
        existing_names: file_contexts.map((c) => c.name)
      })

      for (const [root, files] of files_by_workspace.entries()) {
        if (files.length === 0) continue
        const p = get_contexts_file_path(root)
        const dir = path.dirname(p)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        const current_file_contexts = load_contexts_from_file(p)
        const condensed_paths = condense_paths({
          paths: files,
          workspace_root: root,
          workspace_provider: params.workspace_provider
        })
        const relative_paths = condensed_paths.map((p) => p.replace(/\\/g, '/'))

        const new_context: SavedContext = {
          name: unique_name,
          paths: relative_paths
        }
        current_file_contexts.unshift(new_context)
        await save_contexts_to_file({
          contexts: current_file_contexts,
          file_path: p
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
        t('command.context-restoration.overwrite.prompt', {
          name: context_name
        }),
        { modal: true },
        t('command.context-restoration.overwrite.action')
      )

      if (choice === t('command.context-restoration.overwrite.action')) {
        const current_roots = context_to_roots.get(context_name) || []
        const all_roots = new Set([
          ...current_roots,
          ...files_by_workspace.keys()
        ])

        for (const root of all_roots) {
          const p = get_contexts_file_path(root)
          let contexts = load_contexts_from_file(p)
          contexts = contexts.filter((c) => c.name !== context_name)

          const files = files_by_workspace.get(root) || []
          if (files.length > 0 || current_roots.includes(root)) {
            if (files.length > 0) {
              const dir = path.dirname(p)
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
            }
            let relative_paths: string[] = []
            if (files.length > 0) {
              const condensed_paths = condense_paths({
                paths: files,
                workspace_root: root,
                workspace_provider: params.workspace_provider
              })
              relative_paths = condensed_paths.map((p) => p.replace(/\\/g, '/'))
            }
            contexts.unshift({ name: context_name, paths: relative_paths })
          }
          await save_contexts_to_file({ contexts, file_path: p })
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
