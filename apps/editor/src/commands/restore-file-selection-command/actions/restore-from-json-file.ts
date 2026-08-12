import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { SavedContext } from '@/types/context'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import {
  select_context_paths,
  load_and_merge_file_contexts,
  save_contexts_to_file,
  get_contexts_file_path,
  load_contexts_from_file,
  group_files_by_workspace,
  condense_paths,
  create_context_description
} from '@/features/context-restoration'
import { t } from '@/i18n'
import { normalize_path } from '@/utils/normalize-path'

export const restore_from_json_file = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  on_context_selected: () => void
  show_back_button?: boolean
}): Promise<'back' | void> => {
  try {
    let { merged: file_contexts, context_to_roots } =
      await load_and_merge_file_contexts()

    const edit_button = {
      iconPath: new vscode.ThemeIcon('edit'),
      tooltip: t('command.restore-file-selection.action.rename')
    }
    const delete_button = {
      iconPath: new vscode.ThemeIcon('trash'),
      tooltip: t('command.restore-file-selection.action.delete')
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
            label: t('command.restore-file-selection.entries-az'),
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

      const back_or_close_button =
        params.show_back_button !== false
          ? vscode.QuickInputButtons.Back
          : { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }

      const quick_pick = vscode.window.createQuickPick<any>()
      quick_pick.title = t('command.restore-file-selection.select-saved.title')
      quick_pick.placeholder = t(
        'command.restore-file-selection.select-saved.file'
      )
      quick_pick.buttons = [back_or_close_button]
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
          if (button === back_or_close_button) {
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
          const input_box = vscode.window.createInputBox()
          input_box.title = t('command.restore-file-selection.rename.title')
          input_box.prompt = t('command.restore-file-selection.rename.prompt')
          input_box.value = old_name
          const new_name = await new Promise<string | undefined>((resolve) => {
            let accepted = false
            const disposables: vscode.Disposable[] = []
            const validate = (value: string) => {
              const trimmed = value.trim()
              if (!trimmed) {
                input_box.validationMessage = t(
                  'command.restore-file-selection.rename.empty'
                )
                return false
              }
              if (
                file_contexts.find(
                  (c) => c.name === trimmed && c.name !== old_name
                )
              ) {
                input_box.validationMessage = t(
                  'command.restore-file-selection.rename.exists'
                )
                return false
              }
              input_box.validationMessage = ''
              return true
            }
            disposables.push(
              input_box.onDidChangeValue(validate),
              input_box.onDidAccept(() => {
                if (!validate(input_box.value)) return
                accepted = true
                resolve(input_box.value.trim())
                input_box.hide()
              }),
              input_box.onDidHide(() => {
                if (!accepted) resolve(undefined)
                disposables.forEach((d) => d.dispose())
                input_box.dispose()
              })
            )
            input_box.show()
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
            t('command.restore-file-selection.delete.prompt', {
              name: old_name
            }),
            { modal: true },
            t('command.restore-file-selection.delete.action')
          )
          active_dialog_count--

          if (choice == t('command.restore-file-selection.delete.action')) {
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
                const relative_paths = condensed_paths.map(normalize_path)
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
