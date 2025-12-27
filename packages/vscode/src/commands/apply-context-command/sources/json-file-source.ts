import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { SavedContext } from '@/types/context'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { apply_saved_context } from '../helpers/applying'
import {
  save_contexts_to_file,
  get_contexts_file_path,
  ask_for_new_context_name,
  group_files_by_workspace,
  condense_paths,
  load_contexts_from_file,
  resolve_unique_context_name
} from '../helpers/saving'

const LABEL_NEW_ENTRY = '$(add) New entry...'

export const load_and_merge_file_contexts = async (): Promise<{
  merged: SavedContext[]
  context_to_roots: Map<string, string[]>
}> => {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const contexts_by_name = new Map<
    string,
    { paths: string[]; roots: string[] }
  >()
  const should_prefix = workspace_folders.length > 1

  for (const folder of workspace_folders) {
    const contexts_file_path = get_contexts_file_path(folder.uri.fsPath)
    const contexts = load_contexts_from_file(contexts_file_path)

    for (const context of contexts) {
      if (!contexts_by_name.has(context.name)) {
        contexts_by_name.set(context.name, { paths: [], roots: [] })
      }
      const entry = contexts_by_name.get(context.name)!

      const paths_to_add = should_prefix
        ? context.paths.map((p) => `${folder.name}:${p}`)
        : context.paths

      entry.paths.push(...paths_to_add)
      entry.roots.push(folder.uri.fsPath)
    }
  }

  const merged: SavedContext[] = []
  const context_to_roots = new Map<string, string[]>()

  for (const [name, data] of contexts_by_name.entries()) {
    merged.push({
      name,
      paths: data.paths
    })
    context_to_roots.set(name, data.roots)
  }

  return { merged, context_to_roots }
}

export const handle_json_file_source = async (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  on_context_selected: () => void
): Promise<'back' | void> => {
  try {
    let { merged: file_contexts, context_to_roots } =
      await load_and_merge_file_contexts()
    const workspace_folders = vscode.workspace.workspaceFolders || []

    const edit_button = {
      iconPath: new vscode.ThemeIcon('edit'),
      tooltip: 'Rename'
    }
    const delete_button = {
      iconPath: new vscode.ThemeIcon('trash'),
      tooltip: 'Delete'
    }
    const open_file_button = {
      iconPath: new vscode.ThemeIcon('file'),
      tooltip: 'Open contexts.json'
    }

    let active_dialog_count = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const create_items = () => {
        const items: (vscode.QuickPickItem & {
          context?: SavedContext
          buttons?: vscode.QuickInputButton[]
        })[] = []

        items.push({ label: LABEL_NEW_ENTRY })

        if (file_contexts.length > 0) {
          items.push({
            label: 'entries',
            kind: vscode.QuickPickItemKind.Separator
          })

          for (const context of file_contexts) {
            const roots = context_to_roots.get(context.name) || []
            let description = `${context.paths.length} path${
              context.paths.length === 1 ? '' : 's'
            }`

            if (roots.length > 1) {
              const workspace_names = roots.map((root) => {
                const folder = workspace_folders.find(
                  (f) => f.uri.fsPath === root
                )
                return folder?.name || path.basename(root)
              })
              description += ` · ${workspace_names.join(', ')}`
            }

            items.push({
              label: context.name,
              description,
              context: context,
              buttons: [edit_button, delete_button]
            })
          }
        }
        return items
      }

      const quick_pick = vscode.window.createQuickPick<any>()
      quick_pick.title = 'Select Saved Context'
      quick_pick.items = create_items()
      quick_pick.placeholder = `Select saved context (from .vscode/contexts.json)`
      quick_pick.buttons = [vscode.QuickInputButtons.Back, open_file_button]

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
          } else if (button === open_file_button) {
            const folders = vscode.workspace.workspaceFolders
            if (folders && folders.length > 0) {
              let file_path: string | undefined
              if (folders.length === 1) {
                file_path = get_contexts_file_path(folders[0].uri.fsPath)
              } else {
                active_dialog_count++
                const picked = await vscode.window.showQuickPick(
                  folders.map((f) => ({
                    label: f.name,
                    description: f.uri.fsPath,
                    folder: f
                  })),
                  { placeHolder: 'Select workspace folder' }
                )
                active_dialog_count--
                if (picked) {
                  file_path = get_contexts_file_path(picked.folder.uri.fsPath)
                }
              }

              if (file_path) {
                if (!fs.existsSync(file_path)) {
                  try {
                    const dir = path.dirname(file_path)
                    if (!fs.existsSync(dir))
                      fs.mkdirSync(dir, { recursive: true })
                    fs.writeFileSync(file_path, '[]', 'utf8')
                  } catch (e) {
                    vscode.window.showErrorMessage(
                      `Failed to create file: ${e}`
                    )
                  }
                }
                const doc = await vscode.workspace.openTextDocument(file_path)
                await vscode.window.showTextDocument(doc)
                quick_pick.hide()
                resolve_once('exit')
              }
            }
          }
        })

        quick_pick.onDidAccept(() => {
          const item = quick_pick.selectedItems[0]
          quick_pick.hide()
          resolve_once(item)
        })

        quick_pick.onDidHide(() => {
          if (active_dialog_count === 0) {
            resolve_once('back')
          }
        })

        quick_pick.onDidTriggerItemButton((e) => {
          quick_pick.hide()
          resolve_once({ ...e.item, triggeredButton: e.button })
        })

        quick_pick.show()
      })

      quick_pick.dispose()

      if (selection == 'back') return 'back'
      if (selection == 'exit') return
      if (selection == 'retry') continue

      // Handle buttons
      if (selection.triggeredButton) {
        const item = selection
        const old_name = item.context.name

        if (selection.triggeredButton === edit_button) {
          active_dialog_count++
          const input = vscode.window.createInputBox()
          input.title = 'Rename Context'
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
              if (changed) {
                await save_contexts_to_file(contexts, p)
              }
            }

            const reloaded = await load_and_merge_file_contexts()
            file_contexts = reloaded.merged
            context_to_roots = reloaded.context_to_roots
          }
        } else if (selection.triggeredButton === delete_button) {
          active_dialog_count++
          const choice = await vscode.window.showInformationMessage(
            `Delete context "${old_name}"?`,
            { modal: true },
            'Delete'
          )
          active_dialog_count--

          if (choice == 'Delete') {
            const roots_to_update = context_to_roots.get(old_name) || []

            for (const root of roots_to_update) {
              const p = get_contexts_file_path(root)
              let contexts = load_contexts_from_file(p)
              const original_len = contexts.length
              contexts = contexts.filter((c) => c.name !== old_name)
              if (contexts.length !== original_len) {
                await save_contexts_to_file(contexts, p)
              }
            }
            const reloaded = await load_and_merge_file_contexts()
            file_contexts = reloaded.merged
            context_to_roots = reloaded.context_to_roots
          }
        }
        continue
      }

      if (selection.label === LABEL_NEW_ENTRY) {
        const checked_files = workspace_provider.get_checked_files()
        if (checked_files.length === 0) {
          active_dialog_count++
          await vscode.window.showWarningMessage(
            dictionary.warning_message.NOTHING_IN_CONTEXT_TO_SAVE
          )
          active_dialog_count--
          continue
        }

        active_dialog_count++
        const name = await ask_for_new_context_name(true)
        active_dialog_count--

        if (!name || name == 'back') continue

        const existing_names = file_contexts.map((c) => c.name)
        const unique_name = resolve_unique_context_name(name, existing_names)

        const files_by_workspace = group_files_by_workspace(checked_files)
        for (const [root, files] of files_by_workspace.entries()) {
          if (files.length === 0) continue
          const p = get_contexts_file_path(root)
          const dir = path.dirname(p)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

          const current_file_contexts = load_contexts_from_file(p)
          const condensed_paths = condense_paths(
            files,
            root,
            workspace_provider
          )
          const relative_paths = condensed_paths.map((p) =>
            p.replace(/\\/g, '/')
          )

          const new_context: SavedContext = {
            name: unique_name,
            paths: relative_paths
          }

          current_file_contexts.unshift(new_context)
          await save_contexts_to_file(current_file_contexts, p)
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
        const primary_workspace_root = workspace_provider.getWorkspaceRoot()!
        await apply_saved_context(
          selection.context,
          primary_workspace_root,
          workspace_provider,
          extension_context
        )
        on_context_selected()
        return
      }
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_SELECTING_SAVED_CONTEXT(error.message)
    )
    Logger.error({
      function_name: 'apply_context_command',
      message: 'Error selecting saved context',
      data: error
    })
  }
}
