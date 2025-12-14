import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import { LAST_SELECTED_FILE_CONTEXT_NAME_STATE_KEY } from '../../../constants/state-keys'
import { SavedContext } from '@/types/context'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { apply_saved_context } from '../utils'

let active_deletion_timestamp: number | undefined

async function save_contexts_to_file(
  contexts: SavedContext[],
  file_path: string
): Promise<void> {
  try {
    const dir_path = path.dirname(file_path)
    if (!fs.existsSync(dir_path)) {
      fs.mkdirSync(dir_path, { recursive: true })
    }

    if (contexts.length == 0) {
      if (fs.existsSync(file_path)) {
        fs.unlinkSync(file_path)
        Logger.info({
          message: `Deleted empty contexts file: ${file_path}`
        })
      }
    } else {
      fs.writeFileSync(file_path, JSON.stringify(contexts, null, 2), 'utf8')
    }
  } catch (error: any) {
    throw new Error(`Failed to save contexts to file: ${error.message}`)
  }
}

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
    const contexts_file_path = path.join(
      folder.uri.fsPath,
      '.vscode',
      'contexts.json'
    )

    try {
      if (fs.existsSync(contexts_file_path)) {
        const content = fs.readFileSync(contexts_file_path, 'utf8')
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          const contexts = parsed.filter(
            (item) =>
              typeof item == 'object' &&
              item !== null &&
              typeof item.name == 'string' &&
              Array.isArray(item.paths) &&
              item.paths.every((p: any) => typeof p == 'string')
          ) as SavedContext[]

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
      }
    } catch (error: any) {
      Logger.error({
        function_name: 'load_and_merge_file_contexts',
        message: `Error reading contexts file from ${folder.name}`,
        data: error
      })
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

    const create_quick_pick_items = (contexts: SavedContext[]) => {
      const context_items = contexts.map((context, index) => {
        const buttons = [edit_button, delete_button]

        let description = `${context.paths.length} ${
          context.paths.length == 1 ? 'path' : 'paths'
        }`

        const roots = context_to_roots.get(context.name) || []
        if (roots.length > 1) {
          const workspace_names = roots.map((root) => {
            const folder = workspace_folders.find((f) => f.uri.fsPath === root)
            return folder?.name || path.basename(root)
          })
          description += ` · ${workspace_names.join(', ')}`
        }

        return {
          label: context.name,
          description,
          context,
          buttons,
          index
        }
      })

      return context_items
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.title = 'Select Saved Context'
    quick_pick.items = create_quick_pick_items(file_contexts)
    quick_pick.placeholder = `Select saved context (from .vscode/contexts.json)`
    quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const last_selected_context_name =
      extension_context.workspaceState.get<string>(
        LAST_SELECTED_FILE_CONTEXT_NAME_STATE_KEY
      )

    if (last_selected_context_name) {
      const active_item = quick_pick.items.find(
        (item) => item.label === last_selected_context_name
      )
      if (active_item) {
        quick_pick.activeItems = [active_item]
      }
    }

    let active_dialog_count = 0
    let go_back_after_delete = false
    const quick_pick_promise = new Promise<
      | 'back'
      | (vscode.QuickPickItem & {
          context?: SavedContext
        })
      | undefined
    >((resolve) => {
      let is_accepted = false
      let did_trigger_back = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            did_trigger_back = true
            quick_pick.hide()
            resolve('back')
          }
        }),
        quick_pick.onDidAccept(() => {
          is_accepted = true
          const selectedItem = quick_pick
            .selectedItems[0] as vscode.QuickPickItem & {
            context?: SavedContext
          }
          if (selectedItem?.context) {
            extension_context.workspaceState.update(
              LAST_SELECTED_FILE_CONTEXT_NAME_STATE_KEY,
              selectedItem.context.name
            )
          }
          quick_pick.hide()
          resolve(selectedItem)
        }),

        quick_pick.onDidHide(() => {
          if (active_dialog_count > 0) {
            return
          }
          if (go_back_after_delete) {
            resolve('back')
          } else if (!is_accepted && !did_trigger_back) {
            resolve('back')
          }
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        }),

        quick_pick.onDidTriggerItemButton(async (event) => {
          const item = event.item as vscode.QuickPickItem & {
            context: SavedContext
            index: number
          }

          await extension_context.workspaceState.update(
            LAST_SELECTED_FILE_CONTEXT_NAME_STATE_KEY,
            item.context.name
          )

          if (event.button === edit_button) {
            active_dialog_count++

            const input_box = vscode.window.createInputBox()
            input_box.title = 'Rename Context'
            input_box.prompt = 'Enter new name for context'
            input_box.value = item.context.name

            const new_name = await new Promise<string | undefined | 'back'>(
              (resolve) => {
                let accepted = false
                const disposables: vscode.Disposable[] = []

                const validate = (value: string): boolean => {
                  const trimmed_value = value.trim()
                  if (!trimmed_value) {
                    input_box.validationMessage = 'Name cannot be empty'
                    return false
                  }

                  const duplicate = file_contexts.find(
                    (c) =>
                      c.name === trimmed_value && c.name !== item.context.name
                  )
                  if (duplicate) {
                    input_box.validationMessage =
                      'A context with this name already exists'
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
                    if (!accepted) {
                      resolve(undefined)
                    }
                    disposables.forEach((d) => d.dispose())
                    input_box.dispose()
                  })
                )
                input_box.show()
              }
            )
            active_dialog_count--

            let name_to_highlight = item.context.name

            if (new_name && new_name !== 'back') {
              const trimmed_name = new_name
              let context_updated = false

              if (trimmed_name != item.context.name) {
                const roots = context_to_roots.get(item.context.name) || []
                let success = true

                for (const root of roots) {
                  const contexts_file_path = path.join(
                    root,
                    '.vscode',
                    'contexts.json'
                  )

                  try {
                    if (fs.existsSync(contexts_file_path)) {
                      const content = fs.readFileSync(
                        contexts_file_path,
                        'utf8'
                      )
                      let root_contexts = JSON.parse(content)

                      if (!Array.isArray(root_contexts)) {
                        root_contexts = []
                      }

                      const updated_root_contexts = root_contexts.map(
                        (c: SavedContext) =>
                          c.name == item.context.name
                            ? { ...c, name: trimmed_name }
                            : c
                      )

                      await save_contexts_to_file(
                        updated_root_contexts,
                        contexts_file_path
                      )
                    }
                  } catch (error: any) {
                    vscode.window.showErrorMessage(
                      dictionary.error_message.ERROR_UPDATING_CONTEXT_NAME_IN_FILE(
                        error.message
                      )
                    )
                    Logger.error({
                      function_name: 'apply_context_command',
                      message: 'Error updating context name in file',
                      data: error
                    })
                    success = false
                    break
                  }
                }

                if (success) {
                  const reloaded = await load_and_merge_file_contexts()
                  file_contexts = reloaded.merged
                  context_to_roots = reloaded.context_to_roots

                  context_updated = true
                  name_to_highlight = trimmed_name
                }
              }

              if (context_updated) {
                await extension_context.workspaceState.update(
                  LAST_SELECTED_FILE_CONTEXT_NAME_STATE_KEY,
                  trimmed_name
                )
              }
            }

            // Always refresh and show the quick pick, even if cancelled
            quick_pick.items = create_quick_pick_items(file_contexts)
            const active_item = quick_pick.items.find(
              (i) => i.label == name_to_highlight
            )
            if (active_item) {
              quick_pick.activeItems = [active_item]
            }
            quick_pick.show()
            return
          }

          if (event.button === delete_button) {
            const current_timestamp = Date.now()
            active_deletion_timestamp = current_timestamp
            const deleted_context_name = item.context.name

            const roots = context_to_roots.get(deleted_context_name) || []
            const original_file_contents = new Map<string, string>()

            for (const root of roots) {
              const contexts_file_path = path.join(
                root,
                '.vscode',
                'contexts.json'
              )
              if (fs.existsSync(contexts_file_path)) {
                original_file_contents.set(
                  contexts_file_path,
                  fs.readFileSync(contexts_file_path, 'utf8')
                )
              }
            }

            for (const root of roots) {
              const contexts_file_path = path.join(
                root,
                '.vscode',
                'contexts.json'
              )
              try {
                if (fs.existsSync(contexts_file_path)) {
                  const content = fs.readFileSync(contexts_file_path, 'utf8')
                  let root_contexts = JSON.parse(content)
                  if (!Array.isArray(root_contexts)) root_contexts = []

                  root_contexts = root_contexts.filter(
                    (c: SavedContext) => c.name !== deleted_context_name
                  )
                  await save_contexts_to_file(root_contexts, contexts_file_path)
                }
              } catch (error: any) {
                vscode.window.showErrorMessage(
                  dictionary.error_message.ERROR_DELETING_CONTEXT_FROM_FILE(
                    error.message
                  )
                )
              }
            }

            let reloaded = await load_and_merge_file_contexts()
            file_contexts = reloaded.merged
            context_to_roots = reloaded.context_to_roots
            quick_pick.items = create_quick_pick_items(file_contexts)

            active_dialog_count++
            const choice = await vscode.window.showInformationMessage(
              dictionary.information_message.DELETED_CONTEXT_FROM_ALL_ROOTS,
              'Undo'
            )
            active_dialog_count--

            if (active_deletion_timestamp !== current_timestamp) {
              if (choice === 'Undo') {
                vscode.window.showInformationMessage(
                  'Could not undo as another context was deleted.'
                )
              }
              quick_pick.show()
              return
            }

            if (choice == 'Undo') {
              let success = true
              for (const [
                file_path,
                content
              ] of original_file_contents.entries()) {
                try {
                  const original_contexts = JSON.parse(content)
                  await save_contexts_to_file(original_contexts, file_path)
                } catch (error: any) {
                  vscode.window.showErrorMessage(
                    dictionary.error_message.FAILED_TO_UNDO_CHANGES(
                      `Failed to restore context in ${file_path}: ${error.message}`
                    )
                  )
                  success = false
                }
              }

              if (success) {
                reloaded = await load_and_merge_file_contexts()
                file_contexts = reloaded.merged
                context_to_roots = reloaded.context_to_roots
                vscode.window.showInformationMessage(
                  dictionary.information_message.RESTORED_CONTEXT(
                    deleted_context_name
                  )
                )
                quick_pick.items = create_quick_pick_items(file_contexts)
              }
            }

            if (file_contexts.length === 0) {
              await vscode.window.showInformationMessage(
                dictionary.information_message.NO_SAVED_CONTEXTS_IN_JSON_FILE
              )
              go_back_after_delete = true
              quick_pick.hide()
            } else {
              quick_pick.show()
            }
            return
          }
        })
      )
    })

    quick_pick.show()
    const selected = await quick_pick_promise
    if (!selected) return

    if (selected === 'back') {
      return 'back'
    }

    const context_to_apply = file_contexts.find((c) => c.name == selected.label)

    if (!context_to_apply) {
      vscode.window.showErrorMessage(
        dictionary.error_message.COULD_NOT_FIND_SELECTED_CONTEXT(selected.label)
      )
      Logger.error({
        function_name: 'apply_context_command',
        message: 'Could not find selected context after potential edits',
        data: selected.label
      })
      return
    }

    const primary_workspace_root = workspace_provider.getWorkspaceRoot()!

    await apply_saved_context(
      context_to_apply,
      primary_workspace_root,
      workspace_provider,
      extension_context
    )

    on_context_selected()
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
