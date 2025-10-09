import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import {
  SAVED_CONTEXTS_STATE_KEY,
  LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY,
  LAST_APPLY_CONTEXT_OPTION_STATE_KEY,
  LAST_SELECTED_WORKSPACE_CONTEXT_NAME_STATE_KEY,
  LAST_SELECTED_FILE_CONTEXT_NAME_STATE_KEY
} from '../constants/state-keys'
import { SavedContext } from '@/types/context'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'

export async function resolve_glob_patterns(
  patterns: string[],
  workspace_provider: WorkspaceProvider
): Promise<string[]> {
  const all_files_in_cache = new Set<string>()

  for (const root of workspace_provider.getWorkspaceRoots()) {
    const files = await workspace_provider.find_all_files(root)
    files.forEach((file) => all_files_in_cache.add(file))
  }

  let resolved_final_paths: Set<string>
  const has_positive_include_directives = patterns.some(
    (p) => !p.startsWith('!')
  )

  if (!has_positive_include_directives) {
    resolved_final_paths = new Set(all_files_in_cache)
  } else {
    resolved_final_paths = new Set<string>()
  }

  for (const pattern_string of patterns) {
    const is_exclude = pattern_string.startsWith('!')
    const current_actual_pattern = is_exclude
      ? pattern_string.substring(1)
      : pattern_string
    const normalized_pattern = path.normalize(current_actual_pattern)

    const files_this_rule_applies_to = new Set<string>()

    if (fs.existsSync(normalized_pattern)) {
      if (fs.lstatSync(normalized_pattern).isDirectory()) {
        const dir_path = normalized_pattern
        for (const cached_file of all_files_in_cache) {
          const normalized_cached_file = path.normalize(cached_file)
          if (normalized_cached_file.startsWith(dir_path + path.sep)) {
            files_this_rule_applies_to.add(cached_file)
          }
        }
      } else if (fs.lstatSync(normalized_pattern).isFile()) {
        if (all_files_in_cache.has(normalized_pattern)) {
          files_this_rule_applies_to.add(normalized_pattern)
        }
      }
    } else {
      try {
        const glob_matches = glob.sync(normalized_pattern, { absolute: true })
        glob_matches.forEach((match) => {
          const normalized_match = path.normalize(match)
          if (all_files_in_cache.has(normalized_match)) {
            files_this_rule_applies_to.add(normalized_match)
          }
        })
      } catch (error) {
        console.warn(
          `Failed to resolve glob pattern "${normalized_pattern}":`,
          error
        )
      }
    }

    if (is_exclude) {
      files_this_rule_applies_to.forEach((file) =>
        resolved_final_paths.delete(file)
      )
    } else {
      files_this_rule_applies_to.forEach((file) =>
        resolved_final_paths.add(file)
      )
    }
    Logger.info({
      message: `Files this pattern ${pattern_string} applies to: ${files_this_rule_applies_to.size}`,
      data: {
        files_this_rule_applies_to
      }
    })
  }

  Logger.info({
    message: `Resolved final paths: ${resolved_final_paths.size}`
  })

  return [...resolved_final_paths]
}

async function apply_saved_context(
  context: SavedContext,
  workspace_root: string,
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): Promise<void> {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const workspace_map = new Map<string, string>()

  for (const folder of workspace_folders) {
    workspace_map.set(folder.name, folder.uri.fsPath)
  }

  const absolute_paths = context.paths.map((prefixed_path) => {
    const is_exclude = prefixed_path.startsWith('!')
    const path_part = is_exclude ? prefixed_path.substring(1) : prefixed_path

    let resolved_path_part: string

    if (path_part.includes(':')) {
      const [prefix, relative_path] = path_part.split(':', 2)

      const root = workspace_map.get(prefix)

      if (root) {
        resolved_path_part = path.join(root, relative_path)
      } else {
        console.warn(
          `Unknown workspace prefix "${prefix}" in path "${path_part}". Treating as relative to current workspace root.`
        )
        resolved_path_part = path.join(workspace_root, relative_path)
      }
    } else {
      resolved_path_part = path.isAbsolute(path_part)
        ? path_part
        : path.join(workspace_root, path_part)
    }

    return is_exclude ? `!${resolved_path_part}` : resolved_path_part
  })

  const resolved_paths = await resolve_glob_patterns(
    absolute_paths,
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
  let message = `Applied context "${context.name}".`

  const currently_checked_files = workspace_provider.get_checked_files()
  if (currently_checked_files.length > 0) {
    const existing_paths_set = new Set(existing_paths)
    const all_current_files_in_new_context = currently_checked_files.every(
      (file) => existing_paths_set.has(file)
    )

    if (!all_current_files_in_new_context) {
      const quick_pick_options = [
        {
          label: 'Replace',
          description: 'Replace the current context with the selected one'
        },
        {
          label: 'Merge',
          description: 'Merge the selected context with the current one'
        }
      ]

      const last_choice_label = extension_context.workspaceState.get<string>(
        LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY
      )

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = quick_pick_options
      quick_pick.placeholder = `How would you like to apply "${context.name}"?`
      if (last_choice_label) {
        const active_item = quick_pick_options.find(
          (opt) => opt.label === last_choice_label
        )
        if (active_item) {
          quick_pick.activeItems = [active_item]
        }
      }

      const choice = await new Promise<vscode.QuickPickItem | undefined>(
        (resolve) => {
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
        }
      )

      if (!choice) {
        return
      }

      await extension_context.workspaceState.update(
        LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY,
        choice.label
      )
      if (choice.label == 'Merge') {
        paths_to_apply = [
          ...new Set([...currently_checked_files, ...existing_paths])
        ]
        message = `Merged context "${context.name}".`
      }
    }
  }

  await workspace_provider.set_checked_files(paths_to_apply)
  vscode.window.showInformationMessage(message)
}

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

async function load_and_merge_file_contexts(): Promise<{
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
      console.error(`Error reading contexts file from ${folder.name}:`, error)
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

export function apply_context_command(
  workspace_provider: WorkspaceProvider | undefined,
  on_context_selected: () => void,
  extension_context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'codeWebChat.applyContext',
    async () => {
      let show_main_menu = true
      let last_main_selection_value = extension_context.workspaceState.get<
        'clipboard' | 'internal' | 'file' | undefined
      >(LAST_APPLY_CONTEXT_OPTION_STATE_KEY)
      while (show_main_menu) {
        show_main_menu = false

        if (!workspace_provider) {
          vscode.window.showErrorMessage(
            dictionary.error_message.NO_WORKSPACE_PROVIDER
          )
          return
        }

        const workspace_root = workspace_provider.getWorkspaceRoot()
        if (!workspace_root) {
          vscode.window.showErrorMessage(
            dictionary.error_message.NO_WORKSPACE_ROOT
          )
          return
        }

        let internal_contexts: SavedContext[] =
          extension_context.workspaceState.get(SAVED_CONTEXTS_STATE_KEY, [])

        const { merged: file_contexts, context_to_roots } =
          await load_and_merge_file_contexts()
        const workspace_folders = vscode.workspace.workspaceFolders || []

        const main_quick_pick_options: (vscode.QuickPickItem & {
          value: 'clipboard' | 'internal' | 'file'
        })[] = [
          {
            label: 'Find file paths in the clipboard text',
            description: 'Useful when asking AI for a list of relevant files',
            value: 'clipboard'
          }
        ]

        if (internal_contexts.length > 0) {
          main_quick_pick_options.push({
            label: 'Workspace state',
            description: `${internal_contexts.length} ${
              internal_contexts.length == 1 ? 'context' : 'contexts'
            }`,
            value: 'internal'
          })
        }

        if (file_contexts.length > 0) {
          main_quick_pick_options.push({
            label: 'JSON file',
            description: `${file_contexts.length} ${
              file_contexts.length == 1 ? 'context' : 'contexts'
            }`,
            value: 'file'
          })
        }

        if (internal_contexts.length == 0 && file_contexts.length == 0) {
          const main_selection = await vscode.window.showQuickPick(
            main_quick_pick_options,
            {
              placeHolder: 'Select option'
            }
          )

          if (!main_selection) return

          if (main_selection.value == 'clipboard') {
            await vscode.commands.executeCommand(
              'codeWebChat.applyContextFromClipboard'
            )
          }
          return
        }

        const final_quick_pick_options = main_quick_pick_options

        const main_quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { value: 'clipboard' | 'internal' | 'file' }
        >()
        main_quick_pick.items = final_quick_pick_options
        main_quick_pick.placeholder = 'Select option'
        if (last_main_selection_value) {
          const active_item = final_quick_pick_options.find(
            (opt) => opt.value === last_main_selection_value
          )
          if (active_item) {
            main_quick_pick.activeItems = [active_item]
          }
        }

        const main_selection = await new Promise<
          | (vscode.QuickPickItem & {
              value: 'clipboard' | 'internal' | 'file'
            })
          | undefined
        >((resolve) => {
          let is_accepted = false
          main_quick_pick.onDidAccept(() => {
            is_accepted = true
            resolve(main_quick_pick.selectedItems[0])
            main_quick_pick.hide()
          })
          main_quick_pick.onDidHide(() => {
            if (!is_accepted) {
              resolve(undefined)
            }
            main_quick_pick.dispose()
          })
          main_quick_pick.show()
        })

        if (!main_selection) return

        last_main_selection_value = main_selection.value
        await extension_context.workspaceState.update(
          LAST_APPLY_CONTEXT_OPTION_STATE_KEY,
          last_main_selection_value
        )

        if (main_selection.value == 'clipboard') {
          await vscode.commands.executeCommand(
            'codeWebChat.applyContextFromClipboard'
          )
          return
        }

        const context_source = main_selection.value as 'internal' | 'file'
        const contexts_to_use =
          context_source == 'internal' ? internal_contexts : file_contexts

        try {
          const edit_button = {
            iconPath: new vscode.ThemeIcon('edit'),
            tooltip: 'Rename'
          }
          const delete_button = {
            iconPath: new vscode.ThemeIcon('trash'),
            tooltip: 'Delete'
          }

          const BACK_LABEL = '$(arrow-left) Back'

          const create_quick_pick_items = (contexts: SavedContext[]) => {
            const context_items = contexts.map((context, index) => {
              const buttons = [edit_button, delete_button]

              let description = `${context.paths.length} ${
                context.paths.length == 1 ? 'path' : 'paths'
              }`

              if (context_source === 'file') {
                const roots = context_to_roots.get(context.name) || []
                if (roots.length > 1) {
                  const workspace_names = roots.map((root) => {
                    const folder = workspace_folders.find(
                      (f) => f.uri.fsPath === root
                    )
                    return folder?.name || path.basename(root)
                  })
                  description += ` · ${workspace_names.join(', ')}`
                }
              }

              return {
                label: context.name,
                description,
                context,
                buttons,
                index
              }
            })

            return [
              { label: BACK_LABEL },
              { label: '', kind: vscode.QuickPickItemKind.Separator },
              ...context_items
            ]
          }

          const quick_pick = vscode.window.createQuickPick()
          quick_pick.items = create_quick_pick_items(contexts_to_use)
          quick_pick.placeholder = `Select saved context (from ${
            context_source == 'internal'
              ? 'workspace state'
              : '.vscode/contexts.json'
          })`

          const last_selected_context_name_key =
            context_source == 'internal'
              ? LAST_SELECTED_WORKSPACE_CONTEXT_NAME_STATE_KEY
              : LAST_SELECTED_FILE_CONTEXT_NAME_STATE_KEY

          const last_selected_context_name =
            extension_context.workspaceState.get<string>(
              last_selected_context_name_key
            )

          if (last_selected_context_name) {
            const active_item = quick_pick.items.find(
              (item) => item.label === last_selected_context_name
            )
            if (active_item) {
              quick_pick.activeItems = [active_item]
            }
          }

          let is_showing_dialog = false
          const quick_pick_promise = new Promise<
            | (vscode.QuickPickItem & {
                context?: SavedContext
              })
            | undefined
          >((resolve) => {
            let is_accepted = false
            quick_pick.onDidAccept(() => {
              is_accepted = true
              const selectedItem = quick_pick
                .selectedItems[0] as vscode.QuickPickItem & {
                context?: SavedContext
              }
              if (selectedItem?.context) {
                extension_context.workspaceState.update(
                  last_selected_context_name_key,
                  selectedItem.context.name
                )
              }
              quick_pick.hide()
              resolve(selectedItem)
            })

            quick_pick.onDidHide(() => {
              if (is_showing_dialog) {
                return
              }
              if (!is_accepted) {
                resolve(undefined)
              }
            })

            quick_pick.onDidTriggerItemButton(async (event) => {
              const item = event.item as vscode.QuickPickItem & {
                context: SavedContext
                index: number
              }

              await extension_context.workspaceState.update(
                last_selected_context_name_key,
                item.context.name
              )

              if (event.button === edit_button) {
                const current_contexts =
                  context_source == 'internal'
                    ? internal_contexts
                    : file_contexts
                is_showing_dialog = true
                const new_name = await vscode.window.showInputBox({
                  prompt: 'Enter new name for context',
                  value: item.context.name,
                  validateInput: (value) => {
                    if (!value.trim()) {
                      return 'Name cannot be empty'
                    }

                    const duplicate = current_contexts.find(
                      (c) =>
                        c.name == value.trim() && c.name != item.context.name
                    )

                    if (duplicate) {
                      return 'A context with this name already exists'
                    }

                    return null
                  }
                })
                is_showing_dialog = false

                let name_to_highlight = item.context.name

                if (new_name?.trim()) {
                  const trimmed_name = new_name.trim()
                  let updated_contexts: SavedContext[] = []
                  let context_updated = false

                  if (context_source == 'internal') {
                    if (trimmed_name != item.context.name) {
                      updated_contexts = internal_contexts.map((c) =>
                        c.name == item.context.name
                          ? { ...c, name: trimmed_name }
                          : c
                      )

                      await extension_context.workspaceState.update(
                        SAVED_CONTEXTS_STATE_KEY,
                        updated_contexts
                      )
                      internal_contexts = updated_contexts
                      context_updated = true
                      name_to_highlight = trimmed_name
                    }
                  } else if (context_source == 'file') {
                    if (trimmed_name != item.context.name) {
                      const roots =
                        context_to_roots.get(item.context.name) || []
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
                          console.error(
                            'Error updating context name in file:',
                            error
                          )
                          success = false
                          break
                        }
                      }

                      if (success) {
                        const reloaded = await load_and_merge_file_contexts()
                        file_contexts.length = 0
                        file_contexts.push(...reloaded.merged)
                        context_to_roots.clear()
                        reloaded.context_to_roots.forEach((v, k) =>
                          context_to_roots.set(k, v)
                        )

                        context_updated = true
                        name_to_highlight = trimmed_name
                      }
                    }
                  }

                  if (context_updated) {
                    vscode.window.showInformationMessage(
                      `Renamed context to "${trimmed_name}".`
                    )
                    await extension_context.workspaceState.update(
                      last_selected_context_name_key,
                      trimmed_name
                    )
                  }
                }

                // Always refresh and show the quick pick, even if cancelled
                const contexts_to_refresh =
                  context_source == 'internal'
                    ? internal_contexts
                    : file_contexts
                quick_pick.items = create_quick_pick_items(contexts_to_refresh)
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
                is_showing_dialog = true
                const confirm_delete = await vscode.window.showWarningMessage(
                  dictionary.warning_message.CONFIRM_DELETE_CONTEXT(
                    item.context.name
                  ),
                  { modal: true },
                  'Delete'
                )
                is_showing_dialog = false

                if (confirm_delete == 'Delete') {
                  if (context_source == 'internal') {
                    const updated_contexts = internal_contexts.filter(
                      (c) => c.name != item.context.name
                    )

                    await extension_context.workspaceState.update(
                      SAVED_CONTEXTS_STATE_KEY,
                      updated_contexts
                    )
                    internal_contexts = updated_contexts

                    vscode.window.showInformationMessage(
                      `Deleted context "${item.context.name}" from workspace state`
                    )

                    if (internal_contexts.length == 0) {
                      quick_pick.hide()
                      vscode.window.showInformationMessage(
                        dictionary.information_message
                          .NO_SAVED_CONTEXTS_IN_WORKSPACE_STATE
                      )
                    } else {
                      quick_pick.items =
                        create_quick_pick_items(internal_contexts)
                      quick_pick.show()
                    }
                  } else if (context_source == 'file') {
                    const roots = context_to_roots.get(item.context.name) || []
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

                          root_contexts = root_contexts.filter(
                            (c: SavedContext) => c.name !== item.context.name
                          )

                          await save_contexts_to_file(
                            root_contexts,
                            contexts_file_path
                          )
                        }
                      } catch (error: any) {
                        vscode.window.showErrorMessage(
                          `Error deleting context from ${path.basename(
                            root
                          )}: ${error.message}`
                        )
                      }
                    }

                    const reloaded = await load_and_merge_file_contexts()
                    file_contexts.length = 0
                    file_contexts.push(...reloaded.merged)
                    context_to_roots.clear()
                    reloaded.context_to_roots.forEach((v, k) =>
                      context_to_roots.set(k, v)
                    )

                    vscode.window.showInformationMessage(
                      `Deleted context "${item.context.name}" from all workspace roots`
                    )

                    if (file_contexts.length == 0) {
                      quick_pick.hide()
                      vscode.window.showInformationMessage(
                        dictionary.information_message
                          .NO_SAVED_CONTEXTS_IN_JSON_FILE
                      )
                    } else {
                      quick_pick.items = create_quick_pick_items(file_contexts)
                      quick_pick.show()
                    }
                  }
                } else {
                  quick_pick.show()
                }
                return
              }
            })
          })

          quick_pick.show()
          const selected = await quick_pick_promise
          if (!selected) return

          if (selected.label === BACK_LABEL && !selected.context) {
            show_main_menu = true
            continue
          }

          let context_to_apply: SavedContext | undefined
          if (context_source == 'internal') {
            context_to_apply = internal_contexts.find(
              (c) => c.name == selected.label
            )
          } else {
            context_to_apply = file_contexts.find(
              (c) => c.name == selected.label
            )
          }

          if (!context_to_apply) {
            vscode.window.showErrorMessage(
              dictionary.error_message.COULD_NOT_FIND_SELECTED_CONTEXT(
                selected.label
              )
            )
            console.error(
              'Could not find selected context after potential edits:',
              selected.label
            )
            return
          }

          // We need the workspace root for path resolution in apply_saved_context
          // Since we are applying a merged context, we use the primary workspace root
          // for resolving paths that don't use the workspace prefix syntax.
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
            dictionary.error_message.ERROR_SELECTING_SAVED_CONTEXT(
              error.message
            )
          )
          console.error('Error selecting saved context:', error)
        }
      }
    }
  )
}
