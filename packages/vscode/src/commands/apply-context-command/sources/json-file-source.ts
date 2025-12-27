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
  load_contexts_from_file
} from '../helpers/saving'

const LABEL_NEW_ENTRY = '$(add) New entry...'

export async function load_and_merge_file_contexts(): Promise<{
  merged: SavedContext[]
  context_to_roots: Map<string, string[]>
}> {
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

export async function handle_json_file_source(
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  on_context_selected: () => void
): Promise<'back' | void> {
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

    let current_path = ''
    let active_dialog_count = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const create_items = () => {
        const items: (vscode.QuickPickItem & {
          context?: SavedContext
          is_directory?: boolean
          full_path?: string
          buttons?: vscode.QuickInputButton[]
        })[] = []

        items.push({ label: LABEL_NEW_ENTRY })

        const relevant_contexts = file_contexts.filter((c) =>
          c.name.startsWith(current_path)
        )

        const ordered_items: (
          | { type: 'dir'; name: string }
          | { type: 'leaf'; context: SavedContext }
        )[] = []
        const seen_dirs = new Set<string>()

        for (const context of relevant_contexts) {
          const relative_name = context.name.slice(current_path.length)
          if (relative_name.includes('/')) {
            const dir_name = relative_name.split('/')[0]
            if (!seen_dirs.has(dir_name)) {
              seen_dirs.add(dir_name)
              ordered_items.push({ type: 'dir', name: dir_name })
            }
          } else {
            ordered_items.push({ type: 'leaf', context })
          }
        }

        if (ordered_items.length > 0) {
          items.push({
            label: 'entries',
            kind: vscode.QuickPickItemKind.Separator
          })

          for (const item of ordered_items) {
            if (item.type === 'dir') {
              const dir = item.name
              const dir_full_path = current_path + dir + '/'
              const entry_count = relevant_contexts.filter((c) =>
                c.name.startsWith(dir_full_path)
              ).length
              items.push({
                label: dir,
                description: `${entry_count} ${
                  entry_count == 1 ? 'entry' : 'entries'
                }`,
                is_directory: true,
                full_path: dir_full_path,
                buttons: [edit_button, delete_button]
              })
            } else {
              const leaf = item.context
              const relative_name = leaf.name.slice(current_path.length)
              const roots = context_to_roots.get(leaf.name) || []
              let description = `${leaf.paths.length} path${
                leaf.paths.length === 1 ? '' : 's'
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
                label: relative_name,
                description,
                context: leaf,
                buttons: [edit_button, delete_button],
                full_path: leaf.name
              })
            }
          }
        }
        return items
      }

      const quick_pick = vscode.window.createQuickPick<any>()
      quick_pick.title = current_path
        ? `Select Saved Context (${current_path})`
        : 'Select Saved Context'
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
            if (current_path == '') {
              resolve_once('back')
            } else {
              const parts = current_path.split('/')
              parts.pop() // empty
              parts.pop() // dir
              current_path = parts.length > 0 ? parts.join('/') + '/' : ''
              resolve_once('retry')
            }
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

      if (selection == 'back') {
        if (current_path == '') return 'back'
        return 'back'
      }
      if (selection == 'exit') return
      if (selection == 'retry') continue

      // Handle buttons
      if (selection.triggeredButton) {
        const item = selection
        const is_dir = !!item.is_directory
        const full_path = item.full_path!

        if (selection.triggeredButton === edit_button) {
          active_dialog_count++
          const input = vscode.window.createInputBox()
          input.title = is_dir ? 'Rename Folder' : 'Rename Context'
          input.value = item.label
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

          if (new_name && new_name !== item.label) {
            const search_prefix = is_dir ? full_path : full_path
            const replace_prefix = is_dir
              ? current_path + new_name + '/'
              : current_path + new_name

            const roots_to_update = new Set<string>()
            if (is_dir) {
              file_contexts.forEach((c) => {
                if (c.name.startsWith(search_prefix)) {
                  ;(context_to_roots.get(c.name) || []).forEach((r) =>
                    roots_to_update.add(r)
                  )
                }
              })
            } else {
              ;(context_to_roots.get(full_path) || []).forEach((r) =>
                roots_to_update.add(r)
              )
            }

            for (const root of roots_to_update) {
              const p = get_contexts_file_path(root)
              let contexts = load_contexts_from_file(p)
              let changed = false
              contexts = contexts.map((c) => {
                if (is_dir) {
                  if (c.name.startsWith(search_prefix)) {
                    changed = true
                    return {
                      ...c,
                      name: replace_prefix + c.name.slice(search_prefix.length)
                    }
                  }
                } else {
                  if (c.name === search_prefix) {
                    changed = true
                    return { ...c, name: replace_prefix }
                  }
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
            is_dir
              ? `Delete folder "${item.label}" and its contents?`
              : `Delete context "${item.label}"?`,
            { modal: true },
            'Delete'
          )
          active_dialog_count--

          if (choice == 'Delete') {
            const roots_to_update = new Set<string>()
            if (is_dir) {
              file_contexts.forEach((c) => {
                if (c.name.startsWith(full_path)) {
                  ;(context_to_roots.get(c.name) || []).forEach((r) =>
                    roots_to_update.add(r)
                  )
                }
              })
            } else {
              ;(context_to_roots.get(full_path) || []).forEach((r) =>
                roots_to_update.add(r)
              )
            }

            for (const root of roots_to_update) {
              const p = get_contexts_file_path(root)
              let contexts = load_contexts_from_file(p)
              const original_len = contexts.length
              contexts = contexts.filter((c) => {
                if (is_dir) return !c.name.startsWith(full_path)
                return c.name !== full_path
              })
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

        const full_name = current_path + name

        if (file_contexts.some((c) => c.name === full_name)) {
          active_dialog_count++
          const overwrite = await vscode.window.showWarningMessage(
            dictionary.warning_message.CONFIRM_OVERWRITE_CONTEXT(full_name),
            { modal: true },
            'Overwrite'
          )
          active_dialog_count--
          if (overwrite !== 'Overwrite') continue
        }

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
            name: full_name,
            paths: relative_paths
          }

          const existing_index = current_file_contexts.findIndex(
            (c) => c.name === full_name
          )
          if (existing_index !== -1) {
            current_file_contexts[existing_index] = new_context
          } else {
            current_file_contexts.push(new_context)
          }
          current_file_contexts.sort((a, b) => a.name.localeCompare(b.name))
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

      if (selection.is_directory) {
        current_path = selection.full_path!
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
