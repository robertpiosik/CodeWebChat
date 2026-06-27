import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { SavedContext } from '@/types/context'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { select_context_paths } from '../utils/select-context-paths'
import { load_and_merge_file_contexts } from '../utils/file-contexts'
import {
  save_contexts_to_file,
  get_contexts_file_path,
  load_contexts_from_file
} from '../utils/context-file-utils'
import { group_files_by_workspace, condense_paths } from '../utils/path-utils'
import { t } from '@/i18n'
import { create_context_description } from '../utils/create-context-description'

export const restore_from_json_file = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  on_context_selected: () => void
}): Promise<'back' | void> => {
  try {
    let { merged: file_contexts, context_to_roots } =
      await load_and_merge_file_contexts()

    const edit_button = {
      iconPath: new vscode.ThemeIcon('edit'),
      tooltip: t('command.apply-context.action.rename')
    }
    const delete_button = {
      iconPath: new vscode.ThemeIcon('trash'),
      tooltip: t('command.apply-context.action.delete')
    }

    let active_dialog_count = 0
    let name_to_highlight: string | undefined

    while (true) {
      const create_items = async () => {
        const items: (vscode.QuickPickItem & {
          context?: SavedContext
          buttons?: vscode.QuickInputButton[]
        })[] = []

        if (file_contexts.length > 0) {
          items.push({
            label: t('command.apply-context.entries-az'),
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
              context,
              buttons: [edit_button, delete_button]
            })
          }
        }
        return items
      }

      const quick_pick = vscode.window.createQuickPick<any>()
      quick_pick.title = t('command.apply-context.select-saved.title')
      quick_pick.placeholder = t('command.apply-context.select-saved.file')
      quick_pick.buttons = [vscode.QuickInputButtons.Back]
      quick_pick.items = await create_items()

      if (name_to_highlight) {
        const active_item = quick_pick.items.find(
          (i: any) => i.label == name_to_highlight
        )
        if (active_item) quick_pick.activeItems = [active_item]
        name_to_highlight = undefined
      }

      const selection = await new Promise<any>((resolve) => {
        let is_resolved = false
        const resolve_once = (value: any) => {
          if (!is_resolved) {
            is_resolved = true
            resolve(value)
          }
        }

        quick_pick.onDidTriggerButton(async (button) => {
          if (button === vscode.QuickInputButtons.Back) {
            quick_pick.hide()
            resolve_once('back')
          }
        })

        quick_pick.onDidAccept(async () => {
          quick_pick.hide()
          resolve_once(quick_pick.selectedItems[0])
        })

        quick_pick.onDidHide(() => {
          if (active_dialog_count == 0) resolve_once('back')
        })

        quick_pick.onDidTriggerItemButton((e) => {
          quick_pick.hide()
          resolve_once({ ...e.item, triggeredButton: e.button })
        })

        quick_pick.show()
      })

      quick_pick.dispose()

      if (!selection || selection == 'back') return 'back'

      if (selection.triggeredButton) {
        const item = selection
        const old_name = item.context.name

        if (selection.triggeredButton === edit_button) {
          active_dialog_count++
          const input = vscode.window.createInputBox()
          input.title = t('command.apply-context.rename.title')
          input.value = old_name
          const new_name = await new Promise<string | undefined>((resolve) => {
            input.onDidAccept(() => {
              if (input.value.trim()) {
                resolve(input.value.trim())
                input.hide()
              }
            })
            input.onDidHide(() => {
              resolve(undefined)
              input.dispose()
            })
            input.show()
          })
          active_dialog_count--

          if (new_name && new_name !== old_name) {
            const roots_to_update = context_to_roots.get(old_name) || []
            for (const root of roots_to_update) {
              const p = get_contexts_file_path(root)
              let contexts = load_contexts_from_file(p)
              let changed = false
              contexts = contexts.map((c) => {
                if (c.name === old_name) {
                  changed = true
                  return { ...c, name: new_name }
                }
                return c
              })
              if (changed)
                await save_contexts_to_file({ contexts, file_path: p })
            }
            const reloaded = await load_and_merge_file_contexts()
            file_contexts = reloaded.merged
            context_to_roots = reloaded.context_to_roots
          }
          name_to_highlight =
            new_name && new_name != old_name ? new_name : old_name
        } else if (selection.triggeredButton === delete_button) {
          active_dialog_count++
          const choice = await vscode.window.showInformationMessage(
            t('command.apply-context.delete.prompt', { name: old_name }),
            { modal: true },
            t('command.apply-context.delete.action')
          )
          active_dialog_count--

          if (choice == t('command.apply-context.delete.action')) {
            const roots_to_update = context_to_roots.get(old_name) || []
            for (const root of roots_to_update) {
              const p = get_contexts_file_path(root)
              let contexts = load_contexts_from_file(p)
              const original_len = contexts.length
              contexts = contexts.filter((c) => c.name !== old_name)
              if (contexts.length !== original_len)
                await save_contexts_to_file({ contexts, file_path: p })
            }
            const reloaded = await load_and_merge_file_contexts()
            file_contexts = reloaded.merged
            context_to_roots = reloaded.context_to_roots
          }
        }
        continue
      }

      if (selection.context) {
        const result = await select_context_paths({
          context: selection.context,
          workspace_provider: params.workspace_provider,
          update_context_paths: async (remaining_files: string[]) => {
            const files_by_workspace = group_files_by_workspace(remaining_files)
            const current_roots =
              context_to_roots.get(selection.context.name) || []
            const all_roots = new Set([
              ...current_roots,
              ...files_by_workspace.keys()
            ])

            for (const root of all_roots) {
              const files = files_by_workspace.get(root) || []
              const p = get_contexts_file_path(root)

              if (files.length == 0 && !fs.existsSync(p)) continue
              if (files.length > 0) {
                const dir = path.dirname(p)
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
              }

              let contexts = load_contexts_from_file(p)
              contexts = contexts.filter(
                (c) => c.name !== selection.context.name
              )

              if (files.length > 0) {
                const condensed_paths = condense_paths({
                  paths: files,
                  workspace_root: root,
                  workspace_provider: params.workspace_provider
                })
                const relative_paths = condensed_paths.map((p) =>
                  p.replace(/\\/g, '/')
                )
                contexts.unshift({
                  name: selection.context.name,
                  paths: relative_paths
                })
              }
              await save_contexts_to_file({ contexts, file_path: p })
            }

            const reloaded = await load_and_merge_file_contexts()
            file_contexts = reloaded.merged
            context_to_roots = reloaded.context_to_roots
          }
        })
        if (result === 'back') continue
        params.on_context_selected()
        return
      }
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_SELECTING_SAVED_CONTEXT(error.message)
    )
    Logger.error({
      function_name: 'restore_from_json_file',
      message: 'Error selecting saved context',
      data: error
    })
  }
}
