import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import {
  SAVED_CONTEXTS_STATE_KEY,
  LAST_CONTEXT_SAVE_LOCATION_STATE_KEY
} from '../constants/state-keys'
import { SavedContext } from '@/types/context'
import { dictionary } from '@shared/constants/dictionary'

const PROMPT_ENTER_CONTEXT_NAME = 'Enter a name for this context'
const PLACEHOLDER_CONTEXT_NAME = 'e.g., Backend API Context'
const VALIDATION_CONTEXT_NAME_EMPTY = 'Context name cannot be empty.'
const LABEL_NEW_SAVED_CONTEXT = '$(add) New entry...'
const PLACEHOLDER_SELECT_OR_CREATE_CONTEXT =
  'Select existing context to overwrite or create a new one'

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
      }
    } else {
      fs.writeFileSync(file_path, JSON.stringify(contexts, null, 2), 'utf8')
    }
  } catch (error: any) {
    throw new Error(`Failed to save contexts to file: ${error.message}`)
  }
}

async function ask_for_new_context_name(
  with_back_button: boolean
): Promise<string | 'back' | undefined> {
  const input_box = vscode.window.createInputBox()
  input_box.title = 'New Entry'
  input_box.prompt = PROMPT_ENTER_CONTEXT_NAME
  input_box.placeholder = PLACEHOLDER_CONTEXT_NAME

  return new Promise((resolve) => {
    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      input_box.onDidAccept(() => {
        const value = input_box.value.trim()
        if (value.length == 0) {
          input_box.validationMessage = VALIDATION_CONTEXT_NAME_EMPTY
          return
        }
        accepted = true
        resolve(value)
        input_box.hide()
      }),
      input_box.onDidHide(() => {
        if (!accepted) {
          if (with_back_button) {
            resolve('back')
          } else {
            resolve(undefined) // Esc pressed
          }
        }
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      }),
      input_box.onDidChangeValue(() => {
        input_box.validationMessage = ''
      })
    )
    input_box.show()
  })
}

function condense_paths(
  paths: string[],
  workspace_root: string,
  workspace_provider: WorkspaceProvider
): string[] {
  const relative_paths = paths.map((p) => path.relative(workspace_root, p))
  const selected_paths_set = new Set(relative_paths)

  const dir_to_children: Map<string, string[]> = new Map()

  for (const rel_path of relative_paths) {
    const parent_dir = path.dirname(rel_path)
    if (!dir_to_children.has(parent_dir)) {
      dir_to_children.set(parent_dir, [])
    }
    dir_to_children.get(parent_dir)!.push(rel_path)
  }

  function are_all_files_selected(
    dir_path: string,
    condensed_paths_set: Set<string>
  ): boolean {
    try {
      if (selected_paths_set.has(dir_path)) {
        return true
      }

      const abs_dir_path = path.join(workspace_root, dir_path)
      if (
        !fs.existsSync(abs_dir_path) ||
        !fs.lstatSync(abs_dir_path).isDirectory()
      ) {
        return false
      }

      const all_entries = fs.readdirSync(abs_dir_path)

      for (const entry of all_entries) {
        const entry_path = path.join(dir_path, entry)
        const abs_entry_path = path.join(workspace_root, entry_path)

        const current_workspace_root =
          workspace_provider.get_workspace_root_for_file(abs_entry_path) ||
          workspace_root
        const relative_entry_path = path.relative(
          current_workspace_root,
          abs_entry_path
        )
        if (workspace_provider.is_excluded(relative_entry_path)) {
          continue
        }

        if (workspace_provider.is_ignored_by_patterns(abs_entry_path)) {
          continue
        }

        if (fs.lstatSync(abs_entry_path).isDirectory()) {
          if (
            !condensed_paths_set.has(entry_path) &&
            !are_all_files_selected(entry_path, condensed_paths_set)
          ) {
            return false
          }
        } else {
          if (!selected_paths_set.has(entry_path)) {
            return false
          }
        }
      }

      return true
    } catch (error) {
      console.error(`Error checking directory ${dir_path}:`, error)
      return false
    }
  }

  const condensed_paths = new Set(relative_paths)

  const all_dirs_set = new Set<string>()
  for (const dir of dir_to_children.keys()) {
    let current_dir = dir
    while (current_dir != '.' && current_dir != '/') {
      all_dirs_set.add(current_dir)
      current_dir = path.dirname(current_dir)
    }
  }

  const directories = Array.from(all_dirs_set)
  directories.sort(
    (a, b) => b.split(path.sep).length - a.split(path.sep).length
  )

  for (const dir of directories) {
    // Skip "." as it represents the workspace root itself
    if (dir == '.') continue

    if (are_all_files_selected(dir, condensed_paths)) {
      for (const file of dir_to_children.get(dir) || []) {
        condensed_paths.delete(file)
      }

      condensed_paths.add(dir)

      for (const p of Array.from(condensed_paths)) {
        if (p != dir && p.startsWith(dir + path.sep)) {
          condensed_paths.delete(p)
        }
      }
    }
  }

  return Array.from(condensed_paths)
}

function are_paths_equal(paths1: string[], paths2: string[]): boolean {
  if (paths1.length != paths2.length) return false

  const set1 = new Set(paths1)
  return paths2.every((path) => set1.has(path))
}

function add_workspace_prefix(
  relative_paths: string[],
  workspace_root: string
): string[] {
  const workspaceFolders = vscode.workspace.workspaceFolders || []
  const currentWorkspace = workspaceFolders.find(
    (folder) => folder.uri.fsPath == workspace_root
  )

  if (!currentWorkspace || workspaceFolders.length <= 1) {
    return relative_paths
  }

  return relative_paths.map((p) => `${currentWorkspace.name}:${p}`)
}

function group_files_by_workspace(
  checked_files: string[]
): Map<string, string[]> {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const files_by_workspace = new Map<string, string[]>()

  workspace_folders.forEach((folder) => {
    files_by_workspace.set(folder.uri.fsPath, [])
  })

  for (const file of checked_files) {
    const workspace = workspace_folders.find((folder) =>
      file.startsWith(folder.uri.fsPath)
    )

    if (workspace) {
      const files = files_by_workspace.get(workspace.uri.fsPath) || []
      files.push(file)
      files_by_workspace.set(workspace.uri.fsPath, files)
    }
  }

  return files_by_workspace
}

function get_contexts_file_path(workspace_root: string): string {
  return path.join(workspace_root, '.vscode', 'contexts.json')
}

async function load_all_contexts(): Promise<
  Map<string, { contexts: SavedContext[]; root: string }>
> {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const contexts_by_name = new Map<
    string,
    { contexts: SavedContext[]; root: string }
  >()

  for (const folder of workspace_folders) {
    const contexts_file_path = get_contexts_file_path(folder.uri.fsPath)

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
              contexts_by_name.set(context.name, {
                contexts: [],
                root: folder.uri.fsPath
              })
            }
            contexts_by_name.get(context.name)!.contexts.push({
              ...context,
              _root: folder.uri.fsPath // Track which root it came from
            } as any)
          }
        }
      }
    } catch (error: any) {
      console.error(`Error reading contexts file from ${folder.name}:`, error)
    }
  }

  return contexts_by_name
}

export function save_context_command(
  workspace_provider: WorkspaceProvider | undefined,
  extContext: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'codeWebChat.saveContext',
    async () => {
      if (!workspace_provider) {
        vscode.window.showErrorMessage(
          dictionary.warning_message
            .WORKSPACE_PROVIDER_NOT_AVAILABLE_CANNOT_SAVE_CONTEXT
        )
        return
      }

      const workspace_root = workspace_provider.getWorkspaceRoot()
      if (!workspace_root) {
        vscode.window.showErrorMessage(
          dictionary.warning_message
            .NO_WORKSPACE_FOLDER_FOUND_CANNOT_SAVE_CONTEXT
        )
        return
      }

      const checked_files = workspace_provider.get_checked_files()
      if (checked_files.length == 0) {
        vscode.window.showWarningMessage(
          dictionary.warning_message.NOTHING_IN_CONTEXT_TO_SAVE
        )
        return
      }

      const workspace_folders = vscode.workspace.workspaceFolders || []

      const files_by_workspace = group_files_by_workspace(checked_files)

      const contextsByWorkspace = new Map<string, string[]>()
      let all_prefixed_paths: string[] = []

      for (const [root, files] of files_by_workspace.entries()) {
        if (files.length == 0) continue

        const condensed_paths = condense_paths(files, root, workspace_provider)
        const relative_paths = condensed_paths.map((p) => p.replace(/\\/g, '/'))

        contextsByWorkspace.set(root, relative_paths)

        const prefixed_paths = add_workspace_prefix(relative_paths, root)
        all_prefixed_paths = [...all_prefixed_paths, ...prefixed_paths]
      }

      all_prefixed_paths.sort((a, b) => {
        const workspace_folders = vscode.workspace.workspaceFolders

        const get_path_part_for_sorting = (full_path: string): string => {
          if (workspace_folders && workspace_folders.length > 1) {
            for (const folder of workspace_folders) {
              const prefix = `${folder.name}:`
              if (full_path.startsWith(prefix)) {
                if (full_path.length > prefix.length) {
                  return full_path.substring(prefix.length)
                } else if (full_path.length == prefix.length) {
                  // Should ideally not happen if paths are like "WorkspaceName:."
                  return '.'
                }
              }
            }
          }
          return full_path
        }

        const path_part_a = get_path_part_for_sorting(a)
        const path_part_b = get_path_part_for_sorting(b)

        const is_nested_a = path_part_a.includes('/')
        const is_nested_b = path_part_b.includes('/')

        if (is_nested_a && !is_nested_b) {
          return -1
        }
        if (!is_nested_a && is_nested_b) {
          return 1
        }

        return a.localeCompare(b)
      })

      let show_storage_selection = true
      while (show_storage_selection) {
        show_storage_selection = false

        const last_save_location = extContext.workspaceState.get<
          'internal' | 'file'
        >(LAST_CONTEXT_SAVE_LOCATION_STATE_KEY)

        const quick_pick_storage_options: (vscode.QuickPickItem & {
          value: 'internal' | 'file'
        })[] = [
          {
            label: 'Workspace State',
            description: 'internal storage',
            value: 'internal'
          },
          {
            label: 'JSON File',
            description: '.vscode/contexts.json',
            value: 'file'
          }
        ]

        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { value: 'internal' | 'file' }
        >()
        quick_pick.title = 'Save Context'
        quick_pick.items = quick_pick_storage_options
        quick_pick.placeholder = 'Where do you want to save this context?'

        if (last_save_location) {
          const active_item = quick_pick_storage_options.find(
            (opt) => opt.value == last_save_location
          )
          if (active_item) {
            quick_pick.activeItems = [active_item]
          }
        }

        const selection = await new Promise<
          (vscode.QuickPickItem & { value: 'internal' | 'file' }) | undefined
        >((resolve) => {
          let is_accepted = false
          quick_pick.onDidAccept(() => {
            is_accepted = true
            resolve(quick_pick.selectedItems[0])
            quick_pick.hide()
          })
          quick_pick.onDidHide(() => {
            if (!is_accepted) {
              resolve(undefined)
            }
            quick_pick.dispose()
          })
          quick_pick.show()
        })

        if (!selection) {
          return
        }

        const save_location = selection.value as 'internal' | 'file'

        await extContext.workspaceState.update(
          LAST_CONTEXT_SAVE_LOCATION_STATE_KEY,
          save_location
        )

        if (save_location == 'file') {
          try {
            let context_selection_done = false
            while (!context_selection_done) {
              let all_contexts_map = await load_all_contexts()
              const existing_context_names = Array.from(
                all_contexts_map.keys()
              )

              let context_name: string | undefined
              let is_new_entry = false

              if (existing_context_names.length == 0) {
                const name_result = await ask_for_new_context_name(true)
                if (name_result == 'back') {
                  show_storage_selection = true
                  break
                }
                if (!name_result) {
                  return
                }
                context_name = name_result
                is_new_entry = true
              } else {
                const delete_button = {
                  iconPath: new vscode.ThemeIcon('trash'),
                  tooltip: 'Delete'
                }

                const create_quick_pick_items = (
                  contextsMap: typeof all_contexts_map
                ) => {
                  const names = Array.from(contextsMap.keys())
                  return [
                    { label: LABEL_NEW_SAVED_CONTEXT },
                    { label: '', kind: vscode.QuickPickItemKind.Separator },
                    ...names.map((name) => {
                      const context_info = contextsMap.get(name)!
                      const roots_with_context = context_info.contexts.map(
                        (c) => (c as any)._root
                      )
                      const workspace_names = roots_with_context.map((root) => {
                        const folder = workspace_folders.find(
                          (f) => f.uri.fsPath == root
                        )
                        return folder?.name || path.basename(root)
                      })

                      const total_paths = context_info.contexts.reduce(
                        (sum, c) => sum + c.paths.length,
                        0
                      )

                      return {
                        label: name,
                        description:
                          workspace_names.length > 1
                            ? `${total_paths} paths · ${workspace_names.join(
                                ', '
                              )}`
                            : `${total_paths} paths`,
                        buttons: [delete_button]
                      }
                    })
                  ]
                }

                const quick_pick_contexts = vscode.window.createQuickPick()
                quick_pick_contexts.items =
                  create_quick_pick_items(all_contexts_map)
                quick_pick_contexts.placeholder =
                  PLACEHOLDER_SELECT_OR_CREATE_CONTEXT
                quick_pick_contexts.title = 'Save Context'
                quick_pick_contexts.buttons = [vscode.QuickInputButtons.Back]

                let is_showing_dialog = false
                const selected_item = await new Promise<
                  vscode.QuickPickItem | 'back' | undefined
                >((resolve) => {
                  let is_accepted = false
                  let did_trigger_back = false
                  const disposables: vscode.Disposable[] = []

                  disposables.push(
                    quick_pick_contexts.onDidChangeValue((value) => {
                      if (value) {
                        quick_pick_contexts.items =
                          create_quick_pick_items(all_contexts_map).slice(2)
                      } else {
                        quick_pick_contexts.items =
                          create_quick_pick_items(all_contexts_map)
                      }
                    }),
                    quick_pick_contexts.onDidTriggerButton((button) => {
                      if (button === vscode.QuickInputButtons.Back) {
                        did_trigger_back = true
                        quick_pick_contexts.hide()
                        resolve('back')
                      }
                    }),
                    quick_pick_contexts.onDidTriggerItemButton(
                      async (event) => {
                        const deleted_context_name = event.item.label
                        const context_info =
                          all_contexts_map.get(deleted_context_name)
                        if (!context_info) return

                        const roots = context_info.contexts.map(
                          (c) => (c as any)._root
                        )
                        const unique_roots = [...new Set(roots)]
                        const original_file_contents = new Map<string, string>()

                        for (const root of unique_roots) {
                          const file_path = get_contexts_file_path(root)
                          if (fs.existsSync(file_path)) {
                            original_file_contents.set(
                              file_path,
                              fs.readFileSync(file_path, 'utf8')
                            )
                          }
                        }

                        for (const root of unique_roots) {
                          const file_path = get_contexts_file_path(root)
                          try {
                            if (fs.existsSync(file_path)) {
                              const content = fs.readFileSync(file_path, 'utf8')
                              let root_contexts = JSON.parse(content)
                              if (!Array.isArray(root_contexts))
                                root_contexts = []
                              root_contexts = root_contexts.filter(
                                (c: SavedContext) =>
                                  c.name !== deleted_context_name
                              )
                              await save_contexts_to_file(
                                root_contexts,
                                file_path
                              )
                            }
                          } catch (error: any) {
                            vscode.window.showErrorMessage(
                              dictionary.error_message.ERROR_DELETING_CONTEXT_FROM_FILE(
                                error.message
                              )
                            )
                          }
                        }

                        all_contexts_map = await load_all_contexts()
                        quick_pick_contexts.items =
                          create_quick_pick_items(all_contexts_map)

                        is_showing_dialog = true
                        const choice = await vscode.window.showInformationMessage(
                          dictionary.information_message.DELETED_CONTEXT_FROM_ALL_ROOTS(
                            deleted_context_name
                          ),
                          'Undo'
                        )
                        is_showing_dialog = false

                        if (choice == 'Undo') {
                          for (const [
                            file_path,
                            content
                          ] of original_file_contents.entries()) {
                            try {
                              fs.writeFileSync(file_path, content, 'utf8')
                            } catch (error: any) {
                              vscode.window.showErrorMessage(
                                dictionary.error_message.FAILED_TO_UNDO_CHANGES(
                                  `Failed to restore context in ${file_path}: ${error.message}`
                                )
                              )
                            }
                          }
                          all_contexts_map = await load_all_contexts()
                          quick_pick_contexts.items =
                            create_quick_pick_items(all_contexts_map)
                          vscode.window.showInformationMessage(
                            dictionary.information_message.RESTORED_CONTEXT(
                              deleted_context_name
                            )
                          )
                        }
                        quick_pick_contexts.show()
                      }
                    ),
                    quick_pick_contexts.onDidAccept(() => {
                      is_accepted = true
                      resolve(quick_pick_contexts.selectedItems[0])
                      quick_pick_contexts.hide()
                    }),
                    quick_pick_contexts.onDidHide(() => {
                      if (is_showing_dialog) return
                      if (!is_accepted && !did_trigger_back) {
                        resolve('back')
                      }
                      disposables.forEach((d) => d.dispose())
                      quick_pick_contexts.dispose()
                    })
                  )
                  quick_pick_contexts.show()
                })

                if (!selected_item) {
                  return
                }

                if (selected_item == 'back') {
                  show_storage_selection = true
                  break // break from while loop
                }

                if (selected_item.label == LABEL_NEW_SAVED_CONTEXT) {
                  const name_result = await ask_for_new_context_name(true)
                  if (name_result == 'back') {
                    continue // re-show quick_pick_contexts
                  }
                  if (!name_result) {
                    return
                  }
                  context_name = name_result

                  if (existing_context_names.includes(context_name)) {
                    const overwrite = await vscode.window.showWarningMessage(
                      dictionary.warning_message.CONFIRM_OVERWRITE_CONTEXT(
                        context_name
                      ),
                      { modal: true },
                      'Overwrite'
                    )

                    if (overwrite != 'Overwrite') {
                      continue // re-show quick pick
                    }
                  }
                  is_new_entry = true
                } else {
                  context_name = selected_item.label
                }
              }

              if (!context_name) {
                if (show_storage_selection) break
                continue
              }

              for (const [
                root,
                relative_paths
              ] of contextsByWorkspace.entries()) {
                const contexts_file_path = get_contexts_file_path(root)
                const vscode_dir = path.dirname(contexts_file_path)

                if (!fs.existsSync(vscode_dir)) {
                  fs.mkdirSync(vscode_dir, { recursive: true })
                }

                let file_contexts: SavedContext[] = []
                if (fs.existsSync(contexts_file_path)) {
                  try {
                    const content = fs.readFileSync(contexts_file_path, 'utf8')
                    if (content.trim().length > 0) {
                      file_contexts = JSON.parse(content)
                      if (!Array.isArray(file_contexts)) {
                        file_contexts = []
                      }
                    }
                  } catch (error) {
                    file_contexts = []
                  }
                }

                const new_context: SavedContext = {
                  name: context_name,
                  paths: relative_paths
                }

                const existing_index = file_contexts.findIndex(
                  (ctx) => ctx.name == context_name
                )

                if (existing_index != -1) {
                  file_contexts[existing_index] = new_context
                } else {
                  file_contexts.push(new_context)
                }

                file_contexts.sort((a, b) => a.name.localeCompare(b.name))

                fs.writeFileSync(
                  contexts_file_path,
                  JSON.stringify(file_contexts, null, 2),
                  'utf8'
                )
              }
              vscode.window.showInformationMessage(
                dictionary.information_message.CONTEXT_SAVED_SUCCESSFULLY
              )

              if (is_new_entry) {
                continue
              } else {
                context_selection_done = true
              }
            }
            if (show_storage_selection) continue
          } catch (error: any) {
            vscode.window.showErrorMessage(
              dictionary.error_message.ERROR_SAVING_CONTEXT_TO_FILE(
                error.message
              )
            )
          }
        } else {
          for (const existingContext of extContext.workspaceState.get(
            SAVED_CONTEXTS_STATE_KEY,
            []
          ) as SavedContext[]) {
            if (are_paths_equal(existingContext.paths, all_prefixed_paths)) {
              vscode.window.showWarningMessage(
                dictionary.warning_message.CONTEXT_WITH_IDENTICAL_PATHS_EXISTS(
                  existingContext.name
                )
              )
              return
            }
          }

          let context_selection_done = false
          while (!context_selection_done) {
            let saved_contexts: SavedContext[] =
              extContext.workspaceState.get(SAVED_CONTEXTS_STATE_KEY, [])

            let context_name: string | undefined
            let is_new_entry = false

            if (saved_contexts.length == 0) {
              const name_result = await ask_for_new_context_name(true)
              if (name_result == 'back') {
                show_storage_selection = true
                break
              }
              if (!name_result) {
                return
              }
              context_name = name_result
              is_new_entry = true
            } else {
              const existing_context_names = saved_contexts.map(
                (context) => context.name
              )
              const delete_button = {
                iconPath: new vscode.ThemeIcon('trash'),
                tooltip: 'Delete'
              }

              const create_quick_pick_items = (contexts: SavedContext[]) => [
                { label: LABEL_NEW_SAVED_CONTEXT },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                ...contexts.map((context) => ({
                  label: context.name,
                  description: `${context.paths.length} ${
                    context.paths.length > 1 ? 'paths' : 'path'
                  }`,
                  buttons: [delete_button]
                }))
              ]

              const quick_pick_contexts = vscode.window.createQuickPick()
              quick_pick_contexts.items = create_quick_pick_items(saved_contexts)
              quick_pick_contexts.placeholder =
                PLACEHOLDER_SELECT_OR_CREATE_CONTEXT
              quick_pick_contexts.title = 'Save Context'
              quick_pick_contexts.buttons = [vscode.QuickInputButtons.Back]
              let is_showing_dialog = false
              const selected_item = await new Promise<
                vscode.QuickPickItem | 'back' | undefined
              >((resolve) => {
                let is_accepted = false
                let did_trigger_back = false
                const disposables: vscode.Disposable[] = []

                disposables.push(
                  quick_pick_contexts.onDidChangeValue((value) => {
                    if (value) {
                      quick_pick_contexts.items =
                        create_quick_pick_items(saved_contexts).slice(2)
                    } else {
                      quick_pick_contexts.items =
                        create_quick_pick_items(saved_contexts)
                    }
                  }),
                  quick_pick_contexts.onDidTriggerButton((button) => {
                    if (button === vscode.QuickInputButtons.Back) {
                      did_trigger_back = true
                      quick_pick_contexts.hide()
                      resolve('back')
                    }
                  }),
                  quick_pick_contexts.onDidTriggerItemButton(async (event) => {
                    const deleted_context_name = event.item.label
                    const original_contexts = [...saved_contexts]
                    const updated_contexts = saved_contexts.filter(
                      (c) => c.name !== deleted_context_name
                    )

                    await extContext.workspaceState.update(
                      SAVED_CONTEXTS_STATE_KEY,
                      updated_contexts
                    )
                    saved_contexts =
                      extContext.workspaceState.get(
                        SAVED_CONTEXTS_STATE_KEY,
                        []
                      ) || []
                    quick_pick_contexts.items =
                      create_quick_pick_items(saved_contexts)

                    is_showing_dialog = true
                    const choice = await vscode.window.showInformationMessage(
                      dictionary.information_message.DELETED_CONTEXT_FROM_WORKSPACE_STATE(
                        deleted_context_name
                      ),
                      'Undo'
                    )
                    is_showing_dialog = false

                    if (choice == 'Undo') {
                      await extContext.workspaceState.update(
                        SAVED_CONTEXTS_STATE_KEY,
                        original_contexts
                      )
                      saved_contexts =
                        extContext.workspaceState.get(
                          SAVED_CONTEXTS_STATE_KEY,
                          []
                        ) || []
                      vscode.window.showInformationMessage(
                        dictionary.information_message.RESTORED_CONTEXT(
                          deleted_context_name
                        )
                      )
                      quick_pick_contexts.items =
                        create_quick_pick_items(saved_contexts)
                    }
                    quick_pick_contexts.show()
                  }),
                  quick_pick_contexts.onDidAccept(() => {
                    is_accepted = true
                    resolve(quick_pick_contexts.selectedItems[0])
                    quick_pick_contexts.hide()
                  }),
                  quick_pick_contexts.onDidHide(() => {
                    if (is_showing_dialog) return
                    if (!is_accepted && !did_trigger_back) {
                      resolve('back')
                    }
                    disposables.forEach((d) => d.dispose())
                    quick_pick_contexts.dispose()
                  })
                )
                quick_pick_contexts.show()
              })

              if (!selected_item) {
                return
              }

              if (selected_item == 'back') {
                show_storage_selection = true
                break // break from while loop
              }

              if (selected_item.label == LABEL_NEW_SAVED_CONTEXT) {
                const name_result = await ask_for_new_context_name(true)

                if (name_result == 'back') {
                  continue // re-show quick_pick_contexts
                }
                if (!name_result) {
                  return
                }
                context_name = name_result

                if (existing_context_names.includes(context_name)) {
                  const overwrite = await vscode.window.showWarningMessage(
                    dictionary.warning_message.CONFIRM_OVERWRITE_CONTEXT_IN_WORKSPACE_STATE(
                      context_name
                    ),
                    { modal: true },
                    'Overwrite'
                  )
                  if (overwrite != 'Overwrite') {
                    continue // re-show quick pick
                  }
                }
                is_new_entry = true
              } else {
                context_name = selected_item.label
              }
            }

            if (!context_name) {
              if (show_storage_selection) break
              continue
            }

            const new_context: SavedContext = {
              name: context_name,
              paths: all_prefixed_paths
            }

            const existing_index = saved_contexts.findIndex(
              (ctx) => ctx.name == context_name
            )

            const updated_contexts = [...saved_contexts]

            if (existing_index != -1) {
              updated_contexts[existing_index] = new_context
            } else {
              updated_contexts.push(new_context)
            }

            updated_contexts.sort((a, b) => a.name.localeCompare(b.name))

            try {
              await extContext.workspaceState.update(
                SAVED_CONTEXTS_STATE_KEY,
                updated_contexts
              )
              vscode.window.showInformationMessage(
                dictionary.information_message.CONTEXT_SAVED_SUCCESSFULLY
              )
            } catch (error: any) {
              vscode.window.showErrorMessage(
                dictionary.error_message.ERROR_SAVING_CONTEXT_TO_WORKSPACE_STATE(
                  error.message
                )
              )
            }
            if (is_new_entry) {
              continue
            } else {
              context_selection_done = true
            }
          }
          if (show_storage_selection) continue
        }
      }
    }
  )
}
