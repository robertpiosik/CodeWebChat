import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import {
  SAVED_CONTEXTS_STATE_KEY,
  LAST_CONTEXT_READ_LOCATION_STATE_KEY
} from '../constants/state-keys'
import { SavedContext } from '@/types/context'
import { Logger } from '../utils/logger'

export async function resolve_glob_patterns(
  patterns: string[],
  workspace_provider: WorkspaceProvider
): Promise<string[]> {
  const all_files_in_cache = new Set<string>()

  for (const root of workspace_provider.getWorkspaceRoots()) {
    const files = workspace_provider.find_all_files(root)
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
    Logger.log({
      message: `Files this pattern ${pattern_string} applies to: ${files_this_rule_applies_to.size}`,
      data: {
        files_this_rule_applies_to
      }
    })
  }

  Logger.log({
    message: `Resolved final paths: ${resolved_final_paths.size}`
  })

  return [...resolved_final_paths]
}

async function apply_saved_context(
  context: SavedContext,
  workspace_root: string,
  workspace_provider: WorkspaceProvider
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
      `No valid paths found in context "${context.name}".`
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
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: 'Replace',
            description: 'Replace the current context with the selected one'
          },
          {
            label: 'Merge',
            description: 'Merge the selected context with the current one'
          }
        ],
        {
          placeHolder: `How would you like to apply "${context.name}"?`
        }
      )

      if (!choice) {
        return // User cancelled
      }

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
        Logger.log({
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

export function apply_context_command(
  workspace_provider: WorkspaceProvider | undefined,
  on_context_selected: () => void,
  extension_context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'codeWebChat.applyContext',
    async () => {
      if (!workspace_provider) {
        vscode.window.showErrorMessage('No workspace provider available')
        return
      }

      const workspace_root = workspace_provider.getWorkspaceRoot()
      if (!workspace_root) {
        vscode.window.showErrorMessage('No workspace root found.')
        return
      }

      const last_read_location = extension_context.workspaceState.get<
        'internal' | 'file'
      >(LAST_CONTEXT_READ_LOCATION_STATE_KEY, 'internal')

      let internal_contexts: SavedContext[] =
        extension_context.workspaceState.get(SAVED_CONTEXTS_STATE_KEY, [])

      const contexts_file_path = path.join(
        workspace_root,
        '.vscode',
        'contexts.json'
      )
      let file_contexts: SavedContext[] = []

      try {
        if (fs.existsSync(contexts_file_path)) {
          const content = fs.readFileSync(contexts_file_path, 'utf8')
          const parsed = JSON.parse(content)
          if (Array.isArray(parsed)) {
            file_contexts = parsed.filter(
              (item) =>
                typeof item == 'object' &&
                item !== null &&
                typeof item.name == 'string' &&
                Array.isArray(item.paths) &&
                item.paths.every((p: any) => typeof p == 'string')
            ) as SavedContext[]
          } else {
            console.warn('Contexts file is not an array:', contexts_file_path)
          }
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error reading contexts file: ${error.message}`
        )
        console.error('Error reading contexts file:', error)
      }

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
          label: 'Workspace State',
          description: `${internal_contexts.length} ${
            internal_contexts.length == 1 ? 'context' : 'contexts'
          }`,
          value: 'internal'
        })
      }

      if (file_contexts.length > 0) {
        main_quick_pick_options.push({
          label: 'JSON File (.vscode/contexts.json)',
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

      const storage_options = main_quick_pick_options.slice(1) // Get all except clipboard
      if (storage_options.length > 1) {
        if (last_read_location == 'file') {
          const file_option_index = storage_options.findIndex(
            (opt) => opt.value == 'file'
          )
          if (file_option_index > -1) {
            const [file_option] = storage_options.splice(file_option_index, 1)
            storage_options.unshift(file_option)
          }
        } else {
          const internal_option_index = storage_options.findIndex(
            (opt) => opt.value == 'internal'
          )
          if (internal_option_index > -1) {
            const [internal_option] = storage_options.splice(
              internal_option_index,
              1
            )
            storage_options.unshift(internal_option)
          }
        }
      }

      const final_quick_pick_options = [
        main_quick_pick_options[0],
        ...storage_options
      ]

      const main_selection = await vscode.window.showQuickPick(
        final_quick_pick_options,
        {
          placeHolder: 'Select option'
        }
      )

      if (!main_selection) return

      if (main_selection.value == 'clipboard') {
        await vscode.commands.executeCommand(
          'codeWebChat.applyContextFromClipboard'
        )
        return
      }

      const context_source = main_selection.value as 'internal' | 'file'
      const contexts_to_use =
        context_source == 'internal' ? internal_contexts : file_contexts

      await extension_context.workspaceState.update(
        LAST_CONTEXT_READ_LOCATION_STATE_KEY,
        context_source
      )

      try {
        const edit_button = {
          iconPath: new vscode.ThemeIcon('edit'),
          tooltip: 'Rename'
        }
        const delete_button = {
          iconPath: new vscode.ThemeIcon('trash'),
          tooltip: 'Delete'
        }

        const create_quick_pick_items = (contexts: SavedContext[]) => {
          const context_items = contexts.map((context) => ({
            label: context.name,
            description: `${context.paths.length} ${
              context.paths.length == 1 ? 'path' : 'paths'
            }`,
            context,
            buttons: [edit_button, delete_button]
          }))

          return context_items
        }

        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = create_quick_pick_items(contexts_to_use)
        quick_pick.placeholder = `Select saved context (from ${
          context_source == 'internal'
            ? 'Workspace State'
            : '.vscode/contexts.json'
        })`

        const quick_pick_promise = new Promise<
          | (vscode.QuickPickItem & {
              context?: SavedContext
            })
          | undefined
        >((resolve) => {
          quick_pick.onDidAccept(() => {
            const selectedItem = quick_pick
              .activeItems[0] as vscode.QuickPickItem & {
              context?: SavedContext
            }
            quick_pick.hide()
            resolve(selectedItem)
          })

          quick_pick.onDidHide(() => {
            resolve(undefined)
          })

          quick_pick.onDidTriggerItemButton(async (event) => {
            const item = event.item as vscode.QuickPickItem & {
              context: SavedContext
            }

            if (event.button === edit_button) {
              const current_contexts =
                context_source == 'internal' ? internal_contexts : file_contexts
              const new_name = await vscode.window.showInputBox({
                prompt: 'Enter new name for context',
                value: item.context.name,
                validateInput: (value) => {
                  if (!value.trim()) {
                    return 'Name cannot be empty'
                  }

                  const duplicate = current_contexts.find(
                    (c) => c.name == value.trim() && c.name != item.context.name
                  )

                  if (duplicate) {
                    return 'A context with this name already exists'
                  }

                  return null
                }
              })

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
                  } else {
                    updated_contexts = internal_contexts
                  }

                  quick_pick.items = create_quick_pick_items(internal_contexts)
                  quick_pick.show()
                } else if (context_source == 'file') {
                  if (trimmed_name != item.context.name) {
                    updated_contexts = file_contexts.map((c) =>
                      c.name == item.context.name
                        ? { ...c, name: trimmed_name }
                        : c
                    )
                    context_updated = true
                  } else {
                    updated_contexts = file_contexts
                  }

                  if (context_updated) {
                    try {
                      await save_contexts_to_file(
                        updated_contexts,
                        contexts_file_path
                      )
                      file_contexts = updated_contexts
                    } catch (error: any) {
                      vscode.window.showErrorMessage(
                        `Error updating context name in file: ${error.message}`
                      )
                      console.error(
                        'Error updating context name in file:',
                        error
                      )
                      updated_contexts = file_contexts
                      context_updated = false
                    }
                  }

                  quick_pick.items = create_quick_pick_items(file_contexts)
                  quick_pick.show()
                }

                if (context_updated) {
                  vscode.window.showInformationMessage(
                    `Renamed context to "${trimmed_name}".`
                  )
                }
              }
              return
            }

            if (event.button === delete_button) {
              const confirm_delete = await vscode.window.showWarningMessage(
                `Are you sure you want to delete context "${item.context.name}"?`,
                { modal: true },
                'Delete'
              )

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
                      'No saved contexts remaining in the Workspace State.'
                    )
                  } else {
                    quick_pick.items =
                      create_quick_pick_items(internal_contexts)
                    quick_pick.show()
                  }
                } else if (context_source == 'file') {
                  const updated_contexts = file_contexts.filter(
                    (c) => c.name != item.context.name
                  )

                  try {
                    await save_contexts_to_file(
                      updated_contexts,
                      contexts_file_path
                    )
                    vscode.window.showInformationMessage(
                      `Deleted context "${item.context.name}" from the JSON file`
                    )
                    file_contexts = updated_contexts

                    if (updated_contexts.length == 0) {
                      quick_pick.hide()
                      vscode.window.showInformationMessage(
                        'No saved contexts remaining in the JSON file.'
                      )
                    } else {
                      quick_pick.items =
                        create_quick_pick_items(updated_contexts)
                      quick_pick.show()
                    }
                  } catch (error: any) {
                    vscode.window.showErrorMessage(
                      `Error deleting context from file: ${error.message}`
                    )
                    console.error('Error deleting context from file:', error)
                  }
                }
              }
              return
            }
          })
        })

        quick_pick.show()
        const selected = await quick_pick_promise
        if (!selected) return

        let context_to_apply: SavedContext | undefined
        if (context_source == 'internal') {
          context_to_apply = internal_contexts.find(
            (c) => c.name == selected.label
          )
        } else {
          context_to_apply = file_contexts.find((c) => c.name == selected.label)
        }

        if (!context_to_apply) {
          vscode.window.showErrorMessage(
            `Could not find the selected context "${selected.label}" after potential edits.`
          )
          console.error(
            'Could not find selected context after potential edits:',
            selected.label
          )
          return
        }

        await apply_saved_context(
          context_to_apply,
          workspace_root,
          workspace_provider
        )

        if (context_source == 'internal') {
          const updated_contexts = internal_contexts.filter(
            (c) => c.name != context_to_apply!.name
          )
          updated_contexts.unshift(context_to_apply!)
          await extension_context.workspaceState.update(
            SAVED_CONTEXTS_STATE_KEY,
            updated_contexts
          )
          internal_contexts = updated_contexts
        }

        on_context_selected()
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error selecting saved context: ${error.message}`
        )
        console.error('Error selecting saved context:', error)
      }
    }
  )
}
