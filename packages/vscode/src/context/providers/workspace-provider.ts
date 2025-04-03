import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import ignore from 'ignore'
import { ignored_extensions } from '../constants/ignored-extensions'
import { should_ignore_file } from '../utils/extension-utils'

export class WorkspaceProvider
  implements vscode.TreeDataProvider<FileItem>, vscode.Disposable
{
  private _on_did_change_tree_data: vscode.EventEmitter<
    FileItem | undefined | null | void
  > = new vscode.EventEmitter<FileItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<
    FileItem | undefined | null | void
  > = this._on_did_change_tree_data.event
  private workspace_roots: string[] = []
  private workspace_names: string[] = []
  private checked_items: Map<string, vscode.TreeItemCheckboxState> = new Map()
  private combined_gitignore = ignore() // To hold all .gitignore rules
  private ignored_extensions: Set<string> = new Set()
  private watcher: vscode.FileSystemWatcher
  private gitignore_watcher: vscode.FileSystemWatcher
  private file_token_counts: Map<string, number> = new Map() // Cache token counts
  private directory_token_counts: Map<string, number> = new Map() // Cache directory token counts
  private config_change_handler: vscode.Disposable
  private _on_did_change_checked_files = new vscode.EventEmitter<void>()
  readonly onDidChangeCheckedFiles = this._on_did_change_checked_files.event
  // Track which files were opened from workspace view to prevent auto-checking
  private opened_from_workspace_view: Set<string> = new Set()
  // Track which tabs are currently in preview mode
  private preview_tabs: Map<string, boolean> = new Map()
  // Tab change handler
  private tab_change_handler: vscode.Disposable
  // Track attachOpenFiles setting
  private attach_open_files: boolean = true
  // Track directories that have some but not all children checked
  private partially_checked_dirs: Set<string> = new Set()
  // Track which workspace root a file belongs to
  private file_workspace_map: Map<string, string> = new Map()

  constructor(workspace_folders: vscode.WorkspaceFolder[]) {
    this.workspace_roots = workspace_folders.map((folder) => folder.uri.fsPath)
    this.workspace_names = workspace_folders.map((folder) => folder.name)
    this.load_all_gitignore_files() // Load all .gitignore files on initialization
    this.load_ignored_extensions()

    // Initialize file to workspace mapping
    this.update_file_workspace_mapping()

    // Load user preference for automatically attaching open files
    const config = vscode.workspace.getConfiguration('geminiCoder')
    this.attach_open_files = config.get('attachOpenFiles', true)

    // Create a file system watcher for general file changes
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*')
    this.watcher.onDidCreate(() => this.handle_file_create())
    this.watcher.onDidChange(() => this.on_file_system_changed())
    this.watcher.onDidDelete(() => this.on_file_system_changed())

    // Watch for .gitignore changes specifically
    this.gitignore_watcher =
      vscode.workspace.createFileSystemWatcher('**/.gitignore')
    this.gitignore_watcher.onDidCreate(() => this.load_all_gitignore_files())
    this.gitignore_watcher.onDidChange(() => this.load_all_gitignore_files())
    this.gitignore_watcher.onDidDelete(() => this.load_all_gitignore_files())

    // Listen for configuration changes
    this.config_change_handler = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration('geminiCoder')) {
          if (event.affectsConfiguration('geminiCoder.attachOpenFiles')) {
            const config = vscode.workspace.getConfiguration('geminiCoder')
            this.update_attach_open_files_setting(
              config.get('attachOpenFiles', true)
            )
          }
          if (event.affectsConfiguration('geminiCoder.ignoredExtensions')) {
            const oldIgnoredExtensions = new Set(this.ignored_extensions)
            this.load_ignored_extensions()
            this.uncheck_ignored_files(oldIgnoredExtensions)
            this.refresh()
          }
        }
      }
    )

    // Initialize the preview tabs map with current tabs
    this.update_preview_tabs_state()

    // Listen for tab changes to update the preview tabs state
    this.tab_change_handler = vscode.window.tabGroups.onDidChangeTabs((e) => {
      this.handle_tab_changes(e)
      this.handle_newly_opened_files()
    })
  }

  // New method to update the file to workspace mapping
  private update_file_workspace_mapping(): void {
    this.file_workspace_map.clear()

    // For each workspace root, map all files to that workspace
    for (const workspace_root of this.workspace_roots) {
      try {
        const files = this.find_all_files(workspace_root)
        for (const file of files) {
          this.file_workspace_map.set(file, workspace_root)
        }
      } catch (error) {
        console.error(
          `Error mapping files for workspace ${workspace_root}:`,
          error
        )
      }
    }
  }

  // Helper method to find all files recursively in a directory
  private find_all_files(dir_path: string): string[] {
    let results: string[] = []
    try {
      const entries = fs.readdirSync(dir_path, { withFileTypes: true })

      for (const entry of entries) {
        const full_path = path.join(dir_path, entry.name)

        // Skip .git directories and other ignored paths
        const relative_path = path.relative(
          this.get_workspace_root_for_file(full_path) || dir_path,
          full_path
        )
        if (this.is_excluded(relative_path)) {
          continue
        }

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          results = results.concat(this.find_all_files(full_path))
        } else if (entry.isFile()) {
          results.push(full_path)
        }
      }
    } catch (error) {
      console.error(`Error finding files in ${dir_path}:`, error)
    }

    return results
  }

  // Get workspace root for a specific file path
  public get_workspace_root_for_file(file_path: string): string | undefined {
    // First check the cached mapping
    if (this.file_workspace_map.has(file_path)) {
      return this.file_workspace_map.get(file_path)
    }

    // If not in the cache, find the workspace root that contains this file
    let matching_root: string | undefined

    for (const root of this.workspace_roots) {
      if (file_path.startsWith(root)) {
        // If we found a match, or if this root is longer than the current match
        // (to handle nested workspace folders)
        if (!matching_root || root.length > matching_root.length) {
          matching_root = root
        }
      }
    }

    // Update the cache with the result
    if (matching_root) {
      this.file_workspace_map.set(file_path, matching_root)
    }

    return matching_root
  }

  // New method to uncheck files that are now ignored
  private uncheck_ignored_files(old_ignored_extensions?: Set<string>): void {
    // Get list of checked files
    const checked_files = this.get_checked_files()

    // Find files that now match ignored extensions but didn't before
    const files_to_uncheck = checked_files.filter((file_path) => {
      if (old_ignored_extensions) {
        // Only uncheck if it wasn't ignored before but is now
        return (
          !should_ignore_file(file_path, old_ignored_extensions) &&
          should_ignore_file(file_path, this.ignored_extensions)
        )
      }
      // Without old extensions comparison, uncheck all that match current ignored list
      return should_ignore_file(file_path, this.ignored_extensions)
    })

    // Uncheck the files
    for (const file_path of files_to_uncheck) {
      this.checked_items.set(file_path, vscode.TreeItemCheckboxState.Unchecked)

      // Update parent directories
      let dir_path = path.dirname(file_path)
      const workspace_root = this.get_workspace_root_for_file(file_path)
      while (workspace_root && dir_path.startsWith(workspace_root)) {
        this.update_parent_state(dir_path)
        dir_path = path.dirname(dir_path)
      }
    }

    // If any files were unchecked, notify listeners
    if (files_to_uncheck.length > 0) {
      this._on_did_change_checked_files.fire()
    }
  }

  public dispose(): void {
    this.watcher.dispose()
    this.gitignore_watcher.dispose()
    this.config_change_handler.dispose()
    this._on_did_change_checked_files.dispose()
    if (this.tab_change_handler) {
      this.tab_change_handler.dispose()
    }
  }

  // Update the preview tabs state
  private update_preview_tabs_state(): void {
    // Clear the current state
    this.preview_tabs.clear()

    // Get current state of all tabs
    vscode.window.tabGroups.all.forEach((tabGroup) => {
      tabGroup.tabs.forEach((tab) => {
        if (tab.input instanceof vscode.TabInputText) {
          const uri = tab.input.uri
          this.preview_tabs.set(uri.fsPath, !!tab.isPreview)
        }
      })
    })
  }

  // Handle tab changes and detect preview to normal transitions
  private handle_tab_changes(e: vscode.TabChangeEvent): void {
    // Process closed tabs first
    if (this.attach_open_files) {
      for (const tab of e.closed) {
        if (tab.input instanceof vscode.TabInputText) {
          const file_path = tab.input.uri.fsPath

          // Skip files not in any workspace
          const workspace_root = this.get_workspace_root_for_file(file_path)
          if (!workspace_root) continue

          // Get relative path to check gitignore
          const relative_path = path.relative(workspace_root, file_path)
          if (this.is_excluded(relative_path)) continue

          if (should_ignore_file(file_path, this.ignored_extensions)) continue

          // Only uncheck if it was checked and not opened from workspace view
          if (
            this.checked_items.get(file_path) ===
              vscode.TreeItemCheckboxState.Checked &&
            !this.opened_from_workspace_view.has(file_path)
          ) {
            this.checked_items.set(
              file_path,
              vscode.TreeItemCheckboxState.Unchecked
            )

            // Update parent directories
            let dir_path = path.dirname(file_path)
            while (workspace_root && dir_path.startsWith(workspace_root)) {
              this.update_parent_state(dir_path)
              dir_path = path.dirname(dir_path)
            }

            this._on_did_change_checked_files.fire()
          }

          // Clean up tracking
          this.preview_tabs.delete(file_path)
        }
      }
    }

    // Process tabs that were changed
    for (const tab of e.changed) {
      // Only track text tabs
      if (tab.input instanceof vscode.TabInputText) {
        const file_path = tab.input.uri.fsPath
        const was_preview = this.preview_tabs.get(file_path)
        const is_now_preview = !!tab.isPreview

        // If the file was in preview mode and now is not
        if (was_preview && !is_now_preview) {
          this.handle_file_out_preview(file_path)
        }

        // Update preview state
        this.preview_tabs.set(file_path, is_now_preview)
      }
    }

    // Process tabs that were opened
    for (const tab of e.opened) {
      if (tab.input instanceof vscode.TabInputText) {
        this.preview_tabs.set(tab.input.uri.fsPath, !!tab.isPreview)
      }
    }
  }

  private handle_file_out_preview(file_path: string): void {
    // Skip files not in any workspace
    const workspace_root = this.get_workspace_root_for_file(file_path)
    if (!workspace_root) return

    // Get relative path to check gitignore
    const relative_path = path.relative(workspace_root, file_path)
    if (this.is_excluded(relative_path)) return

    if (should_ignore_file(file_path, this.ignored_extensions)) return

    // Skip if already checked
    if (
      this.checked_items.get(file_path) === vscode.TreeItemCheckboxState.Checked
    )
      return

    // Check if this file was opened from workspace view
    const was_opened_from_workspace_view =
      this.opened_from_workspace_view.has(file_path)

    // Remove from tracking set - we'll process it now regardless
    if (was_opened_from_workspace_view) {
      this.opened_from_workspace_view.delete(file_path)
    } else if (this.attach_open_files) {
      // Only mark as checked when file is unpinned if attach_open_files is true
      this.checked_items.set(file_path, vscode.TreeItemCheckboxState.Checked)

      // Clear token count to recalculate
      this.file_token_counts.delete(file_path)

      // Update parent directories
      let dir_path = path.dirname(file_path)
      while (workspace_root && dir_path.startsWith(workspace_root)) {
        this.update_parent_state(dir_path)
        dir_path = path.dirname(dir_path)
      }
    }
  }

  // Mark files opened from workspace view
  mark_opened_from_workspace_view(file_path: string): void {
    this.opened_from_workspace_view.add(file_path)
  }

  // Handle newly opened files in workspace view
  private handle_newly_opened_files(): void {
    // Only auto-check new files if the setting is enabled
    if (!this.attach_open_files) return

    const open_file_paths = this.get_open_editors()

    for (const uri of open_file_paths) {
      const file_path = uri.fsPath

      // Skip files not in any workspace
      const workspace_root = this.get_workspace_root_for_file(file_path)
      if (!workspace_root) continue

      // Get relative path to check gitignore
      const relative_path = path.relative(workspace_root, file_path)
      if (this.is_excluded(relative_path)) continue

      if (should_ignore_file(file_path, this.ignored_extensions)) continue

      // Check if this is a new file that isn't in our map yet
      if (!this.checked_items.has(file_path)) {
        // Don't auto-check if the file was opened from workspace view or is in preview mode
        if (
          this.opened_from_workspace_view.has(file_path) ||
          this.preview_tabs.get(file_path)
        ) {
          // The file was opened from workspace view, so keep its current state
          // or set to unchecked if no state exists
          this.checked_items.set(
            file_path,
            vscode.TreeItemCheckboxState.Unchecked
          )

          // Only remove from set if not in preview mode - keep tracking preview files
          if (!this.preview_tabs.get(file_path)) {
            this.opened_from_workspace_view.delete(file_path)
          }
        } else {
          // Auto-check new files opened directly if not in preview mode
          this.checked_items.set(
            file_path,
            vscode.TreeItemCheckboxState.Checked
          )

          // Update parent directories
          let dir_path = path.dirname(file_path)
          while (workspace_root && dir_path.startsWith(workspace_root)) {
            this.update_parent_state(dir_path)
            dir_path = path.dirname(dir_path)
          }
        }

        // Clear token count for this file to force recalculation
        this.file_token_counts.delete(file_path)

        // Fire event to notify listeners
        this._on_did_change_checked_files.fire()
      }
    }

    // Refresh the tree view
    this.refresh()
  }

  // Get all currently open editor URIs
  private get_open_editors(): vscode.Uri[] {
    const open_uris: vscode.Uri[] = []

    vscode.window.tabGroups.all.forEach((tabGroup) => {
      tabGroup.tabs.forEach((tab) => {
        if (tab.input instanceof vscode.TabInputText) {
          open_uris.push(tab.input.uri)
        }
      })
    })

    return open_uris
  }

  // Returns all workspace roots
  public getWorkspaceRoots(): string[] {
    return this.workspace_roots
  }

  // For backward compatibility - returns the first workspace root
  public getWorkspaceRoot(): string {
    return this.workspace_roots.length > 0 ? this.workspace_roots[0] : ''
  }

  // Get workspace name for a specific root
  public getWorkspaceName(root_path: string): string {
    const index = this.workspace_roots.indexOf(root_path)
    if (index !== -1) {
      return this.workspace_names[index]
    }
    return path.basename(root_path)
  }

  private on_file_system_changed(): void {
    // Clear cached token counts when files change
    this.file_token_counts.clear()
    this.directory_token_counts.clear()
    this.refresh()
  }

  private async handle_file_create(): Promise<void> {
    // Clear cached token counts for fresh calculation
    this.file_token_counts.clear()
    this.directory_token_counts.clear()

    // Update the file to workspace mapping
    this.update_file_workspace_mapping()

    // Refresh the tree view
    await this.refresh()

    // If a new file is created within a checked directory, check it automatically
    for (const [dir_path] of this.checked_items) {
      if (
        this.checked_items.get(dir_path) == vscode.TreeItemCheckboxState.Checked
      ) {
        const workspace_root = this.get_workspace_root_for_file(dir_path)
        if (!workspace_root) continue

        const relative_path = path.relative(workspace_root, dir_path)
        const is_excluded = this.is_excluded(relative_path)

        await this.update_directory_check_state(
          dir_path,
          vscode.TreeItemCheckboxState.Checked,
          is_excluded
        )
      }
    }
  }

  async refresh(): Promise<void> {
    this._on_did_change_tree_data.fire()
  }

  clear_checks(): void {
    // Get a list of currently open files to preserve their check state
    const open_files = new Set(this.get_open_editors().map((uri) => uri.fsPath))

    // Find which open files are currently checked
    const checked_open_files = Array.from(this.checked_items.entries())
      .filter(
        ([path, state]) =>
          open_files.has(path) && state == vscode.TreeItemCheckboxState.Checked
      )
      .map(([path]) => path)

    // Create a new map to hold only the open files' check states
    const new_checked_items = new Map<string, vscode.TreeItemCheckboxState>()

    // Preserve open files' check states
    for (const [path, state] of this.checked_items.entries()) {
      if (open_files.has(path)) {
        new_checked_items.set(path, state)
      }
    }

    // Replace the checked_items map with our filtered version
    this.checked_items = new_checked_items

    // Clear partially checked directories
    this.partially_checked_dirs.clear()

    // Update parent directories for open files
    for (const file_path of open_files) {
      if (this.checked_items.has(file_path)) {
        let dir_path = path.dirname(file_path)
        const workspace_root = this.get_workspace_root_for_file(file_path)
        while (workspace_root && dir_path.startsWith(workspace_root)) {
          this.update_parent_state(dir_path)
          dir_path = path.dirname(dir_path)
        }
      }
    }

    // Show info message if there are still checked open files
    if (checked_open_files.length > 0) {
      vscode.window
        .showInformationMessage(
          `${checked_open_files.length} open file${
            checked_open_files.length == 1 ? '' : 's'
          } remain${checked_open_files.length == 1 ? 's' : ''} checked.`,
          'Clear open editors'
        )
        .then((selection) => {
          if (selection == 'Clear open editors') {
            vscode.commands.executeCommand('geminiCoder.clearChecksOpenEditors')
          }
        })
    }

    this.refresh()
    this._on_did_change_checked_files.fire()
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    const key = element.resourceUri.fsPath
    const checkbox_state =
      this.checked_items.get(key) ?? vscode.TreeItemCheckboxState.Unchecked

    element.checkboxState = checkbox_state

    // Get token count and add it to description
    const token_count = element.tokenCount

    if (token_count !== undefined) {
      // Format token count for display (e.g., 1.2k for 1,200)
      const formatted_token_count =
        token_count >= 1000
          ? `${Math.floor(token_count / 1000)}k`
          : `${token_count}`

      // Add token count to description
      if (element.description) {
        element.description = `${formatted_token_count} ${element.description}`
      } else {
        element.description = formatted_token_count
      }
    }

    // Add visual indicator for partially checked directories
    if (element.isDirectory && this.partially_checked_dirs.has(key)) {
      // Add an indicator to the description
      element.description = element.description
        ? `${element.description} ✓`
        : '✓'

      // You could also add an icon overlay or modify the tooltip
      element.tooltip = `${element.tooltip || ''} (Partially selected)`
    }

    // For workspace root items, add a special context value and icon
    if (element.isWorkspaceRoot) {
      element.contextValue = 'workspaceRoot'
      element.iconPath = new vscode.ThemeIcon('root-folder')
      element.tooltip = `${element.label} (Workspace Root)`
    }

    return element
  }

  async getChildren(element?: FileItem): Promise<FileItem[]> {
    if (this.workspace_roots.length == 0) {
      vscode.window.showInformationMessage('No workspace folder found.')
      return []
    }

    // If no element is provided, we're at the root level
    if (!element) {
      // If there's only one workspace root, show its contents directly
      if (this.workspace_roots.length == 1) {
        const single_root = this.workspace_roots[0]
        return this.get_files_and_directories(single_root)
      }
      // Otherwise, show workspace folders as root items
      return this.getWorkspaceFolderItems()
    }

    // For workspace roots or directories, show their contents
    const dir_path = element.resourceUri.fsPath

    // If this directory is excluded by gitignore, don't show its contents
    if (element.isDirectory) {
      const workspace_root = this.get_workspace_root_for_file(dir_path)
      if (workspace_root) {
        const relative_path = path.relative(workspace_root, dir_path)
        if (this.is_excluded(relative_path)) {
          return [] // Return empty array for excluded directories
        }
      }
    }

    return this.get_files_and_directories(dir_path)
  }

  // Create top-level workspace folder items
  private getWorkspaceFolderItems(): FileItem[] {
    return this.workspace_roots.map((root, index) => {
      const uri = vscode.Uri.file(root)
      const name = this.workspace_names[index]

      return new FileItem(
        name,
        uri,
        vscode.TreeItemCollapsibleState.Collapsed,
        true, // Is directory
        this.checked_items.get(root) ?? vscode.TreeItemCheckboxState.Unchecked,
        false, // Is not git ignored
        false, // Is not symbolic link
        false, // Is not open file
        undefined, // Token count will be calculated on demand
        undefined, // Description
        true // Is workspace root
      )
    })
  }

  // Calculate token count for a file
  private async calculate_file_tokens(file_path: string): Promise<number> {
    // Check if we've already calculated this file
    if (this.file_token_counts.has(file_path)) {
      return this.file_token_counts.get(file_path)!
    }

    try {
      // Read file content
      const content = await fs.promises.readFile(file_path, 'utf8')

      // Simple token estimation: character count / 4
      const token_count = Math.floor(content.length / 4)

      // Cache the result
      this.file_token_counts.set(file_path, token_count)

      return token_count
    } catch (error) {
      console.error(`Error calculating tokens for ${file_path}:`, error)
      return 0
    }
  }

  // Calculate token count for a directory (sum of all contained files)
  private async calculate_directory_tokens(dir_path: string): Promise<number> {
    // Check cache first
    if (this.directory_token_counts.has(dir_path)) {
      return this.directory_token_counts.get(dir_path)!
    }

    try {
      const workspace_root = this.get_workspace_root_for_file(dir_path)
      if (!workspace_root) {
        return 0
      }

      // Check if the directory itself is excluded
      const relative_dir_path = path.relative(workspace_root, dir_path)
      if (this.is_excluded(relative_dir_path)) {
        // Directory is excluded, return 0 tokens
        this.directory_token_counts.set(dir_path, 0)
        return 0
      }

      const entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })
      let total_tokens = 0

      for (const entry of entries) {
        const full_path = path.join(dir_path, entry.name)
        const relative_path = path.relative(workspace_root, full_path)

        // Skip excluded files/directories
        if (this.is_excluded(relative_path)) {
          continue
        }

        if (should_ignore_file(entry.name, this.ignored_extensions)) {
          continue
        }

        let is_directory = entry.isDirectory()
        let is_symbolic_link = entry.isSymbolicLink()
        let is_broken_link = false

        // Resolve symbolic link to determine if it points to a directory
        if (is_symbolic_link) {
          try {
            const stats = await fs.promises.stat(full_path)
            is_directory = stats.isDirectory()
          } catch {
            // The symlink is broken
            is_broken_link = true
          }
        }

        if (is_directory && !is_broken_link) {
          // Recurse into subdirectory (including resolved symlinks that are directories)
          total_tokens += await this.calculate_directory_tokens(full_path)
        } else if (
          entry.isFile() ||
          (is_symbolic_link && !is_broken_link && !is_directory)
        ) {
          // Add file tokens (including resolved symlinks that are files)
          total_tokens += await this.calculate_file_tokens(full_path)
        }
      }

      // Cache the result
      this.directory_token_counts.set(dir_path, total_tokens)

      return total_tokens
    } catch (error) {
      console.error(
        `Error calculating tokens for directory ${dir_path}:`,
        error
      )
      return 0
    }
  }

  private async get_files_and_directories(
    dir_path: string
  ): Promise<FileItem[]> {
    const items: FileItem[] = []
    try {
      const workspace_root = this.get_workspace_root_for_file(dir_path)
      if (!workspace_root) {
        return []
      }

      // Check if the directory itself is excluded by gitignore
      const relative_dir_path = path.relative(workspace_root, dir_path)
      if (
        dir_path !== workspace_root && // Don't exclude workspace roots
        this.is_excluded(relative_dir_path)
      ) {
        return [] // Return empty array for excluded directories
      }

      const dir_entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })

      // Sort directories above files and alphabetically
      dir_entries.sort((a, b) => {
        const a_is_dir = a.isDirectory() || a.isSymbolicLink()
        const b_is_dir = b.isDirectory() || b.isSymbolicLink()
        if (a_is_dir && !b_is_dir) return -1
        if (!a_is_dir && b_is_dir) return 1
        return a.name.localeCompare(b.name)
      })

      for (const entry of dir_entries) {
        const full_path = path.join(dir_path, entry.name)
        const relative_path = path.relative(workspace_root, full_path)

        // Check if excluded by .gitignore or other rules
        const is_excluded = this.is_excluded(relative_path)

        // Skip excluded files and directories completely
        if (is_excluded) {
          continue
        }

        const is_ignored_extension = should_ignore_file(
          entry.name,
          this.ignored_extensions
        )

        // Skip files with ignored extensions
        if (is_ignored_extension && !entry.isDirectory()) {
          continue
        }

        const uri = vscode.Uri.file(full_path)
        let is_directory = entry.isDirectory()
        let is_symbolic_link = entry.isSymbolicLink()
        let is_broken_link = false

        if (is_symbolic_link) {
          try {
            const stats = await fs.promises.stat(full_path)
            is_directory = stats.isDirectory()
          } catch (err) {
            // The symlink is broken
            is_broken_link = true
          }
        }

        // Skip broken symlinks
        if (is_broken_link) {
          continue
        }

        const key = full_path

        // Check path against checked_items
        let checkbox_state = this.checked_items.get(key)
        if (checkbox_state === undefined) {
          const parent_path = path.dirname(full_path)
          const parent_checkbox_state = this.checked_items.get(parent_path)
          if (
            parent_checkbox_state == vscode.TreeItemCheckboxState.Checked &&
            !is_ignored_extension
          ) {
            checkbox_state = vscode.TreeItemCheckboxState.Checked
            this.checked_items.set(full_path, checkbox_state)
          } else {
            checkbox_state = vscode.TreeItemCheckboxState.Unchecked
          }
        }

        // Calculate token count
        const token_count = is_directory
          ? await this.calculate_directory_tokens(full_path)
          : await this.calculate_file_tokens(full_path)

        const item = new FileItem(
          entry.name,
          uri,
          is_directory
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          is_directory,
          checkbox_state,
          false, // isGitIgnored is now irrelevant as we're skipping ignored files
          is_symbolic_link,
          false, // is not an open file
          token_count,
          undefined
        )

        items.push(item)
      }
    } catch (error) {
      console.error(`Error reading directory ${dir_path}:`, error)
    }
    return items
  }

  async update_check_state(
    item: FileItem,
    state: vscode.TreeItemCheckboxState
  ): Promise<void> {
    const key = item.resourceUri.fsPath

    // If a partially checked directory is clicked, check it completely
    if (item.isDirectory && this.partially_checked_dirs.has(key)) {
      state = vscode.TreeItemCheckboxState.Checked
      this.partially_checked_dirs.delete(key)
    }

    this.checked_items.set(key, state)

    if (item.isDirectory) {
      await this.update_directory_check_state(key, state, false)
    }

    // Update parent directories' states
    let dir_path = path.dirname(key)
    const workspace_root = this.get_workspace_root_for_file(key)
    while (workspace_root && dir_path.startsWith(workspace_root)) {
      await this.update_parent_state(dir_path)
      dir_path = path.dirname(dir_path)
    }

    this._on_did_change_checked_files.fire()
    this.refresh()
  }

  private async update_parent_state(dir_path: string): Promise<void> {
    try {
      const workspace_root = this.get_workspace_root_for_file(dir_path)
      if (!workspace_root) return

      // Check if the directory itself is excluded
      const relative_dir_path = path.relative(workspace_root, dir_path)
      if (this.is_excluded(relative_dir_path)) {
        // If directory is excluded, ensure it's unchecked
        this.checked_items.set(dir_path, vscode.TreeItemCheckboxState.Unchecked)
        this.partially_checked_dirs.delete(dir_path)
        return
      }

      const dir_entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })

      let all_checked = true
      let any_checked = false
      let has_non_ignored_child = false

      for (const entry of dir_entries) {
        const sibling_path = path.join(dir_path, entry.name)
        const relative_path = path.relative(workspace_root, sibling_path)
        const is_ignored_extension = should_ignore_file(
          entry.name,
          this.ignored_extensions
        )

        // Check if the child is excluded
        if (this.is_excluded(relative_path) || is_ignored_extension) {
          continue
        }

        has_non_ignored_child = true
        const state =
          this.checked_items.get(sibling_path) ??
          vscode.TreeItemCheckboxState.Unchecked

        // Check if the directory itself or any of its children are partially checked
        const is_dir_partially_checked =
          entry.isDirectory() && this.partially_checked_dirs.has(sibling_path)

        if (state != vscode.TreeItemCheckboxState.Checked) {
          all_checked = false
        }

        if (
          state == vscode.TreeItemCheckboxState.Checked ||
          is_dir_partially_checked
        ) {
          any_checked = true
        }
      }

      if (has_non_ignored_child) {
        if (all_checked) {
          this.checked_items.set(dir_path, vscode.TreeItemCheckboxState.Checked)
          this.partially_checked_dirs.delete(dir_path)
        } else if (any_checked) {
          // Partial state: some but not all children are checked
          this.checked_items.set(
            dir_path,
            vscode.TreeItemCheckboxState.Unchecked
          )
          this.partially_checked_dirs.add(dir_path)
        } else {
          this.checked_items.set(
            dir_path,
            vscode.TreeItemCheckboxState.Unchecked
          )
          this.partially_checked_dirs.delete(dir_path)
        }
      } else {
        // If no non-ignored children, set parent to unchecked
        this.checked_items.set(dir_path, vscode.TreeItemCheckboxState.Unchecked)
        this.partially_checked_dirs.delete(dir_path)
      }
    } catch (error) {
      console.error(`Error updating parent state for ${dir_path}:`, error)
    }
  }

  private async update_directory_check_state(
    dir_path: string,
    state: vscode.TreeItemCheckboxState,
    parent_is_excluded: boolean
  ): Promise<void> {
    try {
      const workspace_root = this.get_workspace_root_for_file(dir_path)
      if (!workspace_root) return

      // Check if this directory itself is excluded
      const relative_dir_path = path.relative(workspace_root, dir_path)
      if (this.is_excluded(relative_dir_path) || parent_is_excluded) {
        // Don't recursively check excluded directories
        return
      }

      // Clear partially checked state for this directory when it's being fully checked
      if (state == vscode.TreeItemCheckboxState.Checked) {
        this.partially_checked_dirs.delete(dir_path)
      }

      const dir_entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })

      for (const entry of dir_entries) {
        const full_path = path.join(dir_path, entry.name)
        const relative_path = path.relative(workspace_root, full_path)
        const is_ignored_extension = should_ignore_file(
          entry.name,
          this.ignored_extensions
        )

        // Skip excluded items
        if (this.is_excluded(relative_path) || is_ignored_extension) {
          continue
        }

        this.checked_items.set(full_path, state)

        let is_directory = entry.isDirectory()
        let is_symbolic_link = entry.isSymbolicLink()
        let is_broken_link = false

        if (is_symbolic_link) {
          try {
            const stats = await fs.promises.stat(full_path)
            is_directory = stats.isDirectory()
          } catch {
            // The symlink is broken
            is_broken_link = true
          }
        }

        if (is_directory && !is_broken_link) {
          await this.update_directory_check_state(full_path, state, false)
        }
      }
    } catch (error) {
      console.error(
        `Error updating directory check state for ${dir_path}:`,
        error
      )
    }
  }

  get_checked_files(): string[] {
    return Array.from(this.checked_items.entries())
      .filter(
        ([file_path, state]) =>
          state == vscode.TreeItemCheckboxState.Checked &&
          fs.existsSync(file_path) &&
          (fs.lstatSync(file_path).isFile() ||
            fs.lstatSync(file_path).isSymbolicLink()) &&
          (() => {
            const workspace_root = this.get_workspace_root_for_file(file_path)
            return workspace_root
              ? !this.is_excluded(path.relative(workspace_root, file_path))
              : false
          })()
      )
      .map(([path, _]) => path)
  }

  public async set_checked_files(file_paths: string[]): Promise<void> {
    // Clear existing checks
    this.checked_items.clear()
    this.partially_checked_dirs.clear()

    // First pass: handle directories and create a list of all files to check
    const all_files_to_check: string[] = []

    for (const file_path of file_paths) {
      if (!fs.existsSync(file_path)) continue

      const workspace_root = this.get_workspace_root_for_file(file_path)
      if (!workspace_root) continue

      // Skip files that are excluded by gitignore
      const relative_path = path.relative(workspace_root, file_path)
      if (this.is_excluded(relative_path)) continue

      // Check if this is a directory
      const stats = fs.lstatSync(file_path)
      if (stats.isDirectory()) {
        // For directories, recursively process contents
        this.checked_items.set(file_path, vscode.TreeItemCheckboxState.Checked)
        await this.update_directory_check_state(
          file_path,
          vscode.TreeItemCheckboxState.Checked,
          false
        )
      } else {
        // For files, just add them to the list
        all_files_to_check.push(file_path)
      }
    }

    // Second pass: process individual files
    for (const file_path of all_files_to_check) {
      this.checked_items.set(file_path, vscode.TreeItemCheckboxState.Checked)
    }

    // Update parent directories' checkbox states
    for (const file_path of [...file_paths, ...all_files_to_check]) {
      let dir_path = path.dirname(file_path)
      const workspace_root = this.get_workspace_root_for_file(file_path)
      while (workspace_root && dir_path.startsWith(workspace_root)) {
        await this.update_parent_state(dir_path)
        dir_path = path.dirname(dir_path)
      }
    }

    this.refresh()
  }

  // Load .gitignore from all levels of the workspace
  private async load_all_gitignore_files(): Promise<void> {
    const gitignore_files = await vscode.workspace.findFiles('**/.gitignore')
    this.combined_gitignore = ignore() // Reset

    for (const file_uri of gitignore_files) {
      const gitignore_path = file_uri.fsPath
      const workspace_root = this.get_workspace_root_for_file(gitignore_path)
      if (!workspace_root) continue

      const relative_gitignore_path = path.relative(
        workspace_root,
        path.dirname(gitignore_path)
      )

      try {
        const gitignore_content = fs.readFileSync(gitignore_path, 'utf-8')
        const rules_with_prefix = gitignore_content
          .split('\n')
          .map((rule) => rule.trim())
          .filter((rule) => rule && !rule.startsWith('#'))
          .map((rule) =>
            relative_gitignore_path == ''
              ? rule
              : `${relative_gitignore_path}${
                  rule.startsWith('/') ? rule : `/${rule}`
                }`
          )

        this.combined_gitignore.add(rules_with_prefix)
      } catch (error) {
        console.error(
          `Error reading .gitignore file at ${gitignore_path}:`,
          error
        )
      }
    }

    // Add default exclusions (e.g., node_modules at the root)
    this.combined_gitignore.add(['node_modules/'])

    // After updating gitignore rules, clear token caches since exclusions may have changed
    this.file_token_counts.clear()
    this.directory_token_counts.clear()

    this.refresh()
  }

  public is_excluded(relative_path: string): boolean {
    if (!relative_path || relative_path.trim() === '') {
      return false // Skip empty paths instead of trying to process them
    }

    // .git is never gitignored, should be excluded manually
    if (relative_path.split(path.sep).some((part) => part == '.git')) {
      return true
    }

    // Use the ignore package to check if the path is ignored
    return this.combined_gitignore.ignores(relative_path)
  }

  private load_ignored_extensions() {
    // Get additional extensions from config
    const config = vscode.workspace.getConfiguration('geminiCoder')
    const additional_extensions = config
      .get<string[]>('ignoredExtensions', [])
      .map((ext) => ext.toLowerCase().replace(/^\./, ''))

    // Combine hardcoded and configured extensions
    this.ignored_extensions = new Set([
      ...ignored_extensions,
      ...additional_extensions
    ])

    // Clear token caches since exclusions have changed
    this.file_token_counts.clear()
    this.directory_token_counts.clear()
  }

  public async check_all(): Promise<void> {
    // Check all workspace roots
    for (const workspace_root of this.workspace_roots) {
      this.checked_items.set(
        workspace_root,
        vscode.TreeItemCheckboxState.Checked
      )
      this.partially_checked_dirs.delete(workspace_root)

      // Get all files and directories in this workspace root
      const items = await this.get_files_and_directories(workspace_root)

      // Check each top-level item and its children
      for (const item of items) {
        const key = item.resourceUri.fsPath
        this.checked_items.set(key, vscode.TreeItemCheckboxState.Checked)
        this.partially_checked_dirs.delete(key)

        if (item.isDirectory) {
          await this.update_directory_check_state(
            key,
            vscode.TreeItemCheckboxState.Checked,
            false
          )
        }
      }
    }

    this.refresh()
    this._on_did_change_checked_files.fire()
  }

  // Update the setting when it changes
  public update_attach_open_files_setting(value: boolean): void {
    if (this.attach_open_files == value) {
      return
    }
    this.attach_open_files = value
    this.refresh()
  }
}

export class FileItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public isDirectory: boolean,
    public checkboxState: vscode.TreeItemCheckboxState,
    public isGitIgnored: boolean,
    public isSymbolicLink: boolean = false,
    public isOpenFile: boolean = false,
    public tokenCount?: number,
    description?: string,
    public isWorkspaceRoot: boolean = false
  ) {
    super(label, collapsibleState)
    this.tooltip = this.resourceUri.fsPath
    this.description = description

    // Adjust icon based on directory/workspace root status
    if (this.isWorkspaceRoot) {
      this.iconPath = new vscode.ThemeIcon('root-folder')
      this.contextValue = 'workspaceRoot'
    } else if (this.isDirectory) {
      this.iconPath = new vscode.ThemeIcon('folder')
      this.contextValue = 'directory'
    } else {
      this.iconPath = new vscode.ThemeIcon('file')
      // Use custom command instead of vscode.open
      this.command = {
        command: 'geminiCoder.openFileFromWorkspace',
        title: 'Open File',
        arguments: [this.resourceUri]
      }
    }

    this.checkboxState = checkboxState

    // Set contextValue for open files to enable context menu actions
    if (this.isOpenFile) {
      this.contextValue = 'openEditor'
    }
  }
}
