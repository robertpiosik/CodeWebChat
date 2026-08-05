import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import {
  load_and_merge_file_contexts,
  get_contexts_file_path,
  load_contexts_from_file,
  save_contexts_to_file,
  resolve_unique_context_name,
  group_files_by_workspace,
  condense_paths,
  ask_for_new_context_name,
  create_context_description
} from '@/features/context-restoration'
import { SavedContext } from '@/types/context'
import { t } from '@/i18n'
import { dictionary } from '@shared/constants/dictionary'

export const save_to_json_file = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
}): Promise<'back' | void> => {
  let { merged: file_contexts, context_to_roots } =
    await load_and_merge_file_contexts()
  const LABEL_SAVE_NEW_CONTEXT = t(
    'command.context-restoration.save-new-context.label'
  )

  const edit_button = {
    iconPath: new vscode.ThemeIcon('edit'),
    tooltip: t('command.context-restoration.action.rename')
  }
  const delete_button = {
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: t('command.context-restoration.action.delete')
  }

  let name_to_highlight: string | undefined

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
          context,
          buttons: [edit_button, delete_button]
        })
      }
    }

    const quick_pick = vscode.window.createQuickPick<any>()
    quick_pick.title = t('command.context-restoration.select-saved.title')
    quick_pick.placeholder = t('command.context-restoration.save.placeholder')
    quick_pick.items = items
    quick_pick.buttons = [vscode.QuickInputButtons.Back]

    if (name_to_highlight) {
      const active_item = quick_pick.items.find(
        (i: any) => i.label == name_to_highlight
      )
      if (active_item) quick_pick.activeItems = [active_item]
      name_to_highlight = undefined
    }

    const selection = await new Promise<any>((resolve) => {
      let is_resolved = false
      const resolve_once = (val: any) => {
        if (!is_resolved) {
          is_resolved = true
          resolve(val)
        }
      }

      quick_pick.onDidTriggerButton((btn) => {
        if (btn === vscode.QuickInputButtons.Back) {
          quick_pick.hide()
          resolve_once('back')
        }
      })
      quick_pick.onDidTriggerItemButton((e) => {
        quick_pick.hide()
        resolve_once({ ...e.item, triggeredButton: e.button })
      })
      quick_pick.onDidAccept(() => {
        quick_pick.hide()
        resolve_once(quick_pick.selectedItems[0])
      })
      quick_pick.onDidHide(() => resolve_once(undefined))
      quick_pick.show()
    })

    quick_pick.dispose()

    if (!selection) return
    if (selection === 'back') return 'back'

    if (selection.triggeredButton) {
      const item = selection
      const old_name = item.context.name

      if (selection.triggeredButton === edit_button) {
        const input_box = vscode.window.createInputBox()
        input_box.title = t('command.context-restoration.rename.title')
        input_box.prompt = t('command.context-restoration.rename.prompt')
        input_box.value = old_name
        const new_name = await new Promise<string | undefined>((resolve) => {
          let accepted = false
          const disposables: vscode.Disposable[] = []
          const validate = (value: string) => {
            const trimmed = value.trim()
            if (!trimmed) {
              input_box.validationMessage = t(
                'command.context-restoration.rename.empty'
              )
              return false
            }
            if (
              file_contexts.find(
                (c) => c.name === trimmed && c.name !== old_name
              )
            ) {
              input_box.validationMessage = t(
                'command.context-restoration.rename.exists'
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
            if (changed) await save_contexts_to_file({ contexts, file_path: p })
          }
          const reloaded = await load_and_merge_file_contexts()
          file_contexts = reloaded.merged
          context_to_roots = reloaded.context_to_roots
        }
        name_to_highlight =
          new_name && new_name != old_name ? new_name : old_name
      } else if (selection.triggeredButton === delete_button) {
        const choice = await vscode.window.showInformationMessage(
          t('command.context-restoration.delete.prompt', { name: old_name }),
          { modal: true },
          t('command.context-restoration.delete.action')
        )

        if (choice == t('command.context-restoration.delete.action')) {
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

      const reloaded = await load_and_merge_file_contexts()
      file_contexts = reloaded.merged
      context_to_roots = reloaded.context_to_roots

      continue
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

        const reloaded = await load_and_merge_file_contexts()
        file_contexts = reloaded.merged
        context_to_roots = reloaded.context_to_roots

        continue
      } else {
        continue
      }
    }
  }
}
