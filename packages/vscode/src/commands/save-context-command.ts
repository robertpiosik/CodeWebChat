import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { should_ignore_file } from '../context/utils/extension-utils'
import { ignored_extensions } from '../context/constants/ignored-extensions'
import {
  SAVED_CONTEXTS_STATE_KEY,
  LAST_CONTEXT_SAVE_LOCATION_KEY
} from '../constants/state-keys'
import { SavedContext } from '@/types/context'

function condense_paths(
  paths: string[],
  workspace_root: string,
  workspace_provider: WorkspaceProvider
): string[] {
  // Convert absolute paths to relative paths and create a Set for fast lookup
  const relative_paths = paths.map((p) => path.relative(workspace_root, p))
  const selected_paths_set = new Set(relative_paths)

  // Group paths by their parent directories
  const dir_to_children: Map<string, string[]> = new Map()

  for (const rel_path of relative_paths) {
    const parent_dir = path.dirname(rel_path)
    if (!dir_to_children.has(parent_dir)) {
      dir_to_children.set(parent_dir, [])
    }
    dir_to_children.get(parent_dir)!.push(rel_path)
  }

  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_ignored_extensions = config.get<string[]>(
    'ignoredExtensions',
    []
  )
  const all_ignored_extensions = new Set([
    ...ignored_extensions,
    ...config_ignored_extensions
  ])

  // Function to check if all files in a directory are selected (excluding ignored files)
  function are_all_files_selected(
    dir_path: string,
    condensed_paths_set: Set<string>
  ): boolean {
    try {
      // First check if the directory itself is already selected
      if (selected_paths_set.has(dir_path)) {
        return true
      }

      // Check if directory exists
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

        // Skip files/directories that are excluded by gitignore
        // IMPORTANT: Use the current workspace root for this file
        const current_workspace_root =
          workspace_provider.get_workspace_root_for_file(abs_entry_path) ||
          workspace_root
        const relative_entry_path = path.relative(
          current_workspace_root, // Use the proper workspace root for this file
          abs_entry_path
        )
        if (workspace_provider.is_excluded(relative_entry_path)) {
          continue
        }

        // Skip files with ignored extensions
        if (
          !fs.lstatSync(abs_entry_path).isDirectory() &&
          should_ignore_file(entry, all_ignored_extensions)
        ) {
          continue
        }

        if (fs.lstatSync(abs_entry_path).isDirectory()) {
          // If it's a directory, check if either:
          // 1. All its files are selected recursively, or
          // 2. The directory itself is already in the condensed paths set
          if (
            !condensed_paths_set.has(entry_path) &&
            !are_all_files_selected(entry_path, condensed_paths_set)
          ) {
            return false
          }
        } else {
          // If it's a file, check if it's selected
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

  // Start with all paths and remove those that are covered by directories
  const condensed_paths = new Set(relative_paths)

  // Check directories starting from the DEEPEST level (changed sorting order)
  const directories = Array.from(dir_to_children.keys())
  directories.sort(
    (a, b) => b.split(path.sep).length - a.split(path.sep).length
  )

  // First pass: condense individual files to immediate directories
  for (const dir of directories) {
    // Skip "." as it represents the workspace root itself
    if (dir == '.') continue

    if (are_all_files_selected(dir, condensed_paths)) {
      // Remove all individual files in this directory from the result
      for (const file of dir_to_children.get(dir)!) {
        condensed_paths.delete(file)
      }

      // Add the directory itself
      condensed_paths.add(dir)

      // Also remove any subdirectories that might have been added
      for (const p of Array.from(condensed_paths)) {
        if (p !== dir && p.startsWith(dir + path.sep)) {
          condensed_paths.delete(p)
        }
      }
    }
  }

  // Second pass: condense directories up to their parents if all subdirectories are included
  // Sort directories from shallowest to deepest for this pass
  directories.sort(
    (a, b) => a.split(path.sep).length - b.split(path.sep).length
  )

  for (const dir of directories) {
    if (dir == '.') continue

    const parent_dir = path.dirname(dir)
    if (parent_dir != '.') {
      // Check if all subdirectories of the parent are in the condensed paths
      const parent_children = fs
        .readdirSync(path.join(workspace_root, parent_dir))
        .map((child) => path.join(parent_dir, child))
        .filter((child_path) => {
          const abs_child_path = path.join(workspace_root, child_path)
          // IMPORTANT: Use the current workspace root for this file
          const current_workspace_root =
            workspace_provider.get_workspace_root_for_file(abs_child_path) ||
            workspace_root
          const relative_child_path = path.relative(
            current_workspace_root,
            abs_child_path
          )
          return (
            fs.existsSync(abs_child_path) &&
            fs.lstatSync(abs_child_path).isDirectory() &&
            !workspace_provider.is_excluded(relative_child_path)
          )
        })

      // Check if all valid subdirectories are in condensed_paths
      const all_subdirs_selected = parent_children.every((child) =>
        condensed_paths.has(child)
      )

      if (all_subdirs_selected && parent_children.length > 0) {
        // Remove all subdirectories from the result
        for (const child of parent_children) {
          condensed_paths.delete(child)
        }
        // Add the parent directory
        condensed_paths.add(parent_dir)
      }
    }
  }

  return Array.from(condensed_paths)
}

// Function to check if two path arrays have the same content regardless of order
function are_paths_equal(paths1: string[], paths2: string[]): boolean {
  if (paths1.length != paths2.length) return false

  const set1 = new Set(paths1)
  return paths2.every((path) => set1.has(path))
}

// Add workspace prefix to paths for multi-root workspace support
function add_workspace_prefix(
  relative_paths: string[],
  workspace_root: string
): string[] {
  // Find matching workspace folder for this workspace root
  const workspaceFolders = vscode.workspace.workspaceFolders || []
  const currentWorkspace = workspaceFolders.find(
    (folder) => folder.uri.fsPath == workspace_root
  )

  // If not in a workspace or there's only one workspace folder, no need for prefixes
  if (!currentWorkspace || workspaceFolders.length <= 1) {
    return relative_paths
  }

  // Add the workspace name as a prefix to each path
  return relative_paths.map((p) => `${currentWorkspace.name}:${p}`)
}

// Helper function to group files by workspace root
function group_files_by_workspace(
  checked_files: string[]
): Map<string, string[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders || []
  const filesByWorkspace = new Map<string, string[]>()

  // Initialize map with empty arrays for each workspace
  workspaceFolders.forEach((folder) => {
    filesByWorkspace.set(folder.uri.fsPath, [])
  })

  // Group files by which workspace they belong to
  for (const file of checked_files) {
    // Find the workspace that contains this file
    const workspace = workspaceFolders.find((folder) =>
      file.startsWith(folder.uri.fsPath)
    )

    if (workspace) {
      const files = filesByWorkspace.get(workspace.uri.fsPath) || []
      files.push(file)
      filesByWorkspace.set(workspace.uri.fsPath, files)
    }
  }

  return filesByWorkspace
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
          'Workspace provider is not available. Cannot save context.'
        )
        return
      }

      const workspace_root = workspace_provider.getWorkspaceRoot()
      if (!workspace_root) {
        vscode.window.showErrorMessage(
          'No workspace folder found. Cannot save context.'
        )
        return
      }

      const checked_files = workspace_provider.get_checked_files()
      if (checked_files.length == 0) {
        vscode.window.showWarningMessage('There is nothing to save.')
        return
      }

      let all_prefixed_paths: string[] = []
      const workspaceFolders = vscode.workspace.workspaceFolders || []

      if (workspaceFolders.length <= 1) {
        // Single workspace - process as before
        const condensed_paths = condense_paths(
          checked_files,
          workspace_root,
          workspace_provider
        )
        all_prefixed_paths = add_workspace_prefix(
          condensed_paths,
          workspace_root
        )
      } else {
        // Multi-root workspace - process each workspace separately
        const filesByWorkspace = group_files_by_workspace(checked_files)

        // Process each workspace's files separately
        filesByWorkspace.forEach((files, root) => {
          if (files.length == 0) return

          // Condense paths for this workspace
          const condensed_paths = condense_paths(
            files,
            root,
            workspace_provider
          )

          // Add workspace prefixes
          const prefixed_paths = add_workspace_prefix(condensed_paths, root)
          all_prefixed_paths = [...all_prefixed_paths, ...prefixed_paths]
        })
      }

      // Sort the collected paths alphabetically
      all_prefixed_paths.sort((a, b) => {
        const workspace_folders = vscode.workspace.workspaceFolders;

        const get_path_part_for_sorting = (full_path: string): string => {
          if (workspace_folders && workspace_folders.length > 1) {
            for (const folder of workspace_folders) {
              const prefix = `${folder.name}:`;
              if (full_path.startsWith(prefix)) {
                if (full_path.length > prefix.length) {
                  return full_path.substring(prefix.length);
                } else if (full_path.length === prefix.length) {
                  // Should ideally not happen if paths are like "WorkspaceName:."
                  return ".";
                }
              }
            }
          }
          return full_path;
        };

        const path_part_a = get_path_part_for_sorting(a);
        const path_part_b = get_path_part_for_sorting(b);

        const is_nested_a = path_part_a.includes(path.sep);
        const is_nested_b = path_part_b.includes(path.sep);

        if (is_nested_a && !is_nested_b) {
          return -1; // 'a' is nested, 'b' is root; 'a' comes first.
        }
        if (!is_nested_a && is_nested_b) {
          return 1;  // 'a' is root, 'b' is nested; 'a' comes after.
        }

        return a.localeCompare(b);
      });

      // Check if .vscode/contexts.json exists in the primary workspace root
      const contexts_file_path = path.join(
        workspace_root,
        '.vscode',
        'contexts.json'
      )

      // Get the last used save location from extension context
      const last_save_location = extContext.workspaceState.get<
        'internal' | 'file'
      >(LAST_CONTEXT_SAVE_LOCATION_KEY, 'internal')

      // Create quick pick items with the last used option first
      let quick_pick_storage_options = [
        {
          label: 'Workspace State',
          description: "Save in the editor's internal storage",
          value: 'internal'
        },
        {
          label: 'JSON File',
          description: 'Save in .vscode/contexts.json',
          value: 'file'
        }
      ]

      // Reorder to put the last used option first
      if (last_save_location == 'file') {
        quick_pick_storage_options = quick_pick_storage_options.reverse()
      }

      const selection = await vscode.window.showQuickPick(
        quick_pick_storage_options,
        {
          placeHolder: 'Where do you want to save this context?'
        }
      )

      if (!selection) {
        return // User cancelled
      }

      const save_location = selection.value as 'internal' | 'file'

      // Save the selected option as the last used option
      await extContext.workspaceState.update(
        LAST_CONTEXT_SAVE_LOCATION_KEY,
        save_location
      )

      if (save_location == 'file') {
        // Save to .vscode/contexts.json
        try {
          // Make sure .vscode directory exists
          const vscode_dir = path.join(workspace_root, '.vscode')
          if (!fs.existsSync(vscode_dir)) {
            fs.mkdirSync(vscode_dir, { recursive: true })
          }

          // Read existing contexts or create empty array
          let file_contexts: SavedContext[] = []
          if (fs.existsSync(contexts_file_path)) {
            try {
              const content = fs.readFileSync(contexts_file_path, 'utf8')
              // Handle empty file case
              if (content.trim().length > 0) {
                file_contexts = JSON.parse(content)
                if (!Array.isArray(file_contexts)) {
                  vscode.window.showWarningMessage(
                    `Contexts file is not a valid array. Starting with empty contexts list.`
                  )
                  file_contexts = []
                }
              }
            } catch (error) {
              vscode.window.showWarningMessage(
                `Error reading contexts file. Starting with empty contexts list.` +
                `Details: ${error}` // Added error details for debugging
              )
              file_contexts = []
            }
          }

          // Check if there's already a context with identical paths in the file
          if (file_contexts.length > 0) {
            for (const existingContext of file_contexts) {
              if (are_paths_equal(existingContext.paths, all_prefixed_paths)) {
                vscode.window.showInformationMessage(
                  `A context with identical paths already exists in the file: "${existingContext.name}"`
                )
                return // Return early
              }
            }
          }

          let context_name: string | undefined

          // If contexts are empty, immediately prompt for a name
          if (file_contexts.length == 0) {
            context_name = await vscode.window.showInputBox({
              prompt: 'Enter a name for this context',
              placeHolder: 'e.g., Backend API Context',
              validateInput: (value) =>
                value.trim().length > 0 ? null : 'Context name cannot be empty.'
            })

            if (!context_name) {
              return // User cancelled
            }
          } else {
            // Create quick pick items for file contexts
            const quick_pick_items = [
              {
                label: '$(add) Create new...'
              },
              ...file_contexts.map((context) => ({
                label: context.name,
                description: `${context.paths.length} ${context.paths.length > 1 ? 'paths' : 'path'
                  }`
              }))
            ]

            // Show quick pick with existing contexts and option to create new for JSON file
            const selected_item = await vscode.window.showQuickPick(
              quick_pick_items,
              {
                placeHolder:
                  'Select existing context to overwrite or create a new one'
              }
            )

            if (!selected_item) {
              return // User cancelled
            }

            if (selected_item.label == '$(add) Create new...') {
              // User wants to create a new context
              context_name = await vscode.window.showInputBox({
                prompt: 'Enter a name for this context',
                placeHolder: 'e.g., Backend API Context',
                validateInput: (value) =>
                  value.trim().length > 0
                    ? null
                    : 'Context name cannot be empty.'
              })

              if (!context_name) {
                return // User cancelled
              }

              // Check if the name conflicts with existing one
              const existing_names = file_contexts.map((ctx) => ctx.name)
              if (existing_names.includes(context_name)) {
                const overwrite = await vscode.window.showWarningMessage(
                  `A context named "${context_name}" already exists in the file. Overwrite?`,
                  { modal: true },
                  'Overwrite'
                )

                if (overwrite != 'Overwrite') {
                  return // User chose not to overwrite
                }
              }
            } else {
              // User selected an existing context to overwrite
              context_name = selected_item.label
            }
          }

          // Ensure context_name is defined before proceeding
          if (!context_name) {
            // This case should ideally not be reached if user didn't cancel,
            // but added for safety.
            vscode.window.showErrorMessage('Context name was not provided.')
            return
          }

          const new_context: SavedContext = {
            name: context_name,
            paths: all_prefixed_paths
          }

          // Update contexts array
          const existing_index = file_contexts.findIndex(
            (ctx) => ctx.name == context_name
          )

          if (existing_index != -1) {
            file_contexts[existing_index] = new_context
          } else {
            file_contexts.push(new_context)
          }

          // Sort contexts alphabetically
          file_contexts.sort((a, b) => a.name.localeCompare(b.name))

          // Write to file
          fs.writeFileSync(
            contexts_file_path,
            JSON.stringify(file_contexts, null, 2),
            'utf8'
          )

          vscode.window.showInformationMessage(
            `Context "${context_name}" saved to .vscode/contexts.json successfully.`
          )
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Error saving context to file: ${error.message}`
          )
        }

        return // Exit command after saving to file
      }

      // If we reach here, we're saving to Workspace State (original behavior)
      // Get saved contexts from workspace state
      const saved_contexts: SavedContext[] = extContext.workspaceState.get(
        SAVED_CONTEXTS_STATE_KEY,
        []
      )

      // Check if there's already a context with identical paths in Workspace State
      if (saved_contexts.length > 0) {
        for (const existingContext of saved_contexts) {
          if (are_paths_equal(existingContext.paths, all_prefixed_paths)) {
            vscode.window.showInformationMessage(
              `A context with identical paths already exists in Workspace State: "${existingContext.name}"`
            )
            return // Return early
          }
        }
      }

      let context_name: string | undefined

      // If contexts are empty, immediately prompt for a name
      if (saved_contexts.length == 0) {
        context_name = await vscode.window.showInputBox({
          prompt: 'Enter a name for this context',
          placeHolder: 'e.g., Backend API Context',
          validateInput: (value) =>
            value.trim().length > 0 ? null : 'Context name cannot be empty.'
        })

        if (!context_name) {
          return // User cancelled
        }
      } else {
        // Get existing context names from Workspace State
        const existing_context_names = saved_contexts.map(
          (context) => context.name
        )

        // Create quick pick items for Workspace State
        const quick_pick_items = [
          {
            label: '$(add) Create new...'
          },
          ...saved_contexts.map((context) => ({
            label: context.name,
            description: `${context.paths.length} ${context.paths.length > 1 ? 'paths' : 'path'
              }`
          }))
        ]

        // Show quick pick with existing contexts and option to create new for Workspace State
        const selected_item = await vscode.window.showQuickPick(
          quick_pick_items,
          {
            placeHolder:
              'Select existing context to overwrite or create a new one'
          }
        )

        if (!selected_item) {
          return // User cancelled
        }

        if (selected_item.label == '$(add) Create new...') {
          // User wants to create a new context in Workspace State
          context_name = await vscode.window.showInputBox({
            prompt: 'Enter a name for this context',
            placeHolder: 'e.g., Backend API Context',
            validateInput: (value) =>
              value.trim().length > 0 ? null : 'Context name cannot be empty.'
          })

          if (!context_name) {
            return // User cancelled
          }

          // Check if the name conflicts with existing one in Workspace State
          if (existing_context_names.includes(context_name)) {
            const overwrite = await vscode.window.showWarningMessage(
              `A context named "${context_name}" already exists in Workspace State. Overwrite?`,
              { modal: true },
              'Overwrite'
            )
            if (overwrite != 'Overwrite') {
              return // User chose not to overwrite
            }
          }
        } else {
          // User selected an existing context to overwrite in Workspace State
          context_name = selected_item.label
        }
      }

      // Ensure context_name is defined before proceeding
      if (!context_name) {
        // This case should ideally not be reached if user didn't cancel,
        // but added for safety.
        vscode.window.showErrorMessage('Context name was not provided.')
        return
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
        // Replace existing context
        updated_contexts[existing_index] = new_context
      } else {
        // Add new context
        updated_contexts.push(new_context)
      }

      // Sort contexts alphabetically by name
      updated_contexts.sort((a, b) => a.name.localeCompare(b.name))

      try {
        // Save to workspace state
        await extContext.workspaceState.update(
          SAVED_CONTEXTS_STATE_KEY,
          updated_contexts
        )
        vscode.window.showInformationMessage(
          `Context "${context_name}" saved to Workspace State successfully.`
        )
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error saving context to Workspace State: ${error.message}`
        )
      }
    }
  )
}
