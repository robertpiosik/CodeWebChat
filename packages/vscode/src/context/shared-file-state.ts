import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import {
  WorkspaceProvider,
  FileItem
} from './providers/workspace/workspace-provider'
import { OpenEditorsProvider } from './providers/open-editors/open-editors-provider'

export class SharedFileState {
  private static _instance: SharedFileState
  private _on_did_change_checked_files = new vscode.EventEmitter<void>()
  readonly onDidChangeCheckedFiles = this._on_did_change_checked_files.event

  private _workspace_provider?: WorkspaceProvider
  private _open_editors_provider?: OpenEditorsProvider
  private _checked_files: Set<string> = new Set()
  // Track which view last unchecked a file
  private _unchecked_in_open_editors: Set<string> = new Set()
  private _unchecked_in_workspace: Set<string> = new Set()
  private _synchronizing_provider: 'workspace' | 'openEditors' | null = null
  private _is_synchronizing: boolean = false
  private _is_initialized: boolean = false

  static get_instance(): SharedFileState {
    if (!SharedFileState._instance) {
      SharedFileState._instance = new SharedFileState()
    }
    return SharedFileState._instance
  }

  set_providers(
    workspace_provider: WorkspaceProvider,
    open_editors_provider: OpenEditorsProvider
  ) {
    this._workspace_provider = workspace_provider
    this._open_editors_provider = open_editors_provider

    workspace_provider.onDidChangeCheckedFiles(() => {
      if (!this._is_synchronizing) {
        this._synchronizing_provider = 'workspace'
        this.synchronize_state()
        this._synchronizing_provider = null
      }
    })

    open_editors_provider.onDidChangeCheckedFiles(() => {
      if (!this._is_synchronizing) {
        this._synchronizing_provider = 'openEditors'
        this.synchronize_state()
        this._synchronizing_provider = null
      }
    })

    // Initialize with a synchronization after a small delay to ensure both providers are ready
    setTimeout(() => {
      if (!this._is_initialized) {
        this.synchronize_state()
        this._is_initialized = true
      }
    }, 1000)
  }

  async synchronize_state() {
    if (!this._workspace_provider || !this._open_editors_provider) return
    if (this._is_synchronizing) return

    this._is_synchronizing = true

    try {
      const workspace_checked_files =
        this._workspace_provider.get_checked_files()
      const open_editors_checked_files =
        this._open_editors_provider.get_checked_files()

      const open_editor_uris = this.get_open_editor_uris()
      const open_editor_paths = open_editor_uris.map((uri) => uri.fsPath)

      if (this._synchronizing_provider == 'workspace') {
        for (const file of open_editor_paths) {
          const is_checked_in_workspace =
            this.is_file_checked_in_workspace(file)
          const is_checked_in_open_editors =
            open_editors_checked_files.includes(file)

          if (is_checked_in_workspace !== is_checked_in_open_editors) {
            await this.update_file_in_open_editors(
              file,
              is_checked_in_workspace
            )

            if (is_checked_in_workspace) {
              this._unchecked_in_open_editors.delete(file)
            } else {
              // Only track as explicitly unchecked if it was checked before
              if (open_editors_checked_files.includes(file)) {
                this._unchecked_in_open_editors.add(file)
              }
            }
          }
        }
      } else if (this._synchronizing_provider == 'openEditors') {
        const open_editor_paths_set = new Set(open_editor_paths)

        // Preserve checked state for files that are not open in editors
        const preserved_workspace_checked_files =
          workspace_checked_files.filter(
            (file) => !open_editor_paths_set.has(file)
          )

        // Combine with checked files from open editors
        const new_workspace_checked_files = [
          ...preserved_workspace_checked_files,
          ...open_editors_checked_files
        ]

        await this._workspace_provider.set_checked_files(
          new_workspace_checked_files
        )
      }
      // If no specific provider triggered the sync, do a full sync
      else {
        for (const file of open_editor_paths) {
          const is_checked_in_workspace =
            this.is_file_checked_in_workspace(file)
          const is_checked_in_open_editors =
            open_editors_checked_files.includes(file)

          if (is_checked_in_workspace !== is_checked_in_open_editors) {
            await this.update_file_in_open_editors(
              file,
              is_checked_in_workspace
            )
          }
        }

        for (const file of open_editors_checked_files) {
          if (!workspace_checked_files.includes(file)) {
            await this.update_file_check_state_in_workspace(file, true)
          }
        }
      }

      this.update_checked_files_set()

      this._on_did_change_checked_files.fire()
    } finally {
      this._is_synchronizing = false
    }
  }

  // Check if file is checked in workspace, considering parent directories
  private is_file_checked_in_workspace(file_path: string): boolean {
    if (!this._workspace_provider) return false

    const workspace_checked_files = this._workspace_provider.get_checked_files()

    if (workspace_checked_files.includes(file_path)) {
      return true
    }

    const workspace_root =
      this._workspace_provider.get_workspace_root_for_file(file_path)
    if (!workspace_root) {
      return false
    }

    let current_dir = path.dirname(file_path)
    while (current_dir.startsWith(workspace_root)) {
      if (workspace_checked_files.includes(current_dir)) {
        return true
      }
      current_dir = path.dirname(current_dir)
    }

    return false
  }

  private get_open_editor_uris(): vscode.Uri[] {
    const open_uris: vscode.Uri[] = []
    vscode.window.tabGroups.all.forEach((group) => {
      group.tabs.forEach((tab) => {
        if (tab.input instanceof vscode.TabInputText) {
          open_uris.push(tab.input.uri)
        }
      })
    })
    return open_uris
  }

  private async update_file_in_open_editors(
    file_path: string,
    checked: boolean
  ): Promise<void> {
    if (!this._open_editors_provider) return

    const state = checked
      ? vscode.TreeItemCheckboxState.Checked
      : vscode.TreeItemCheckboxState.Unchecked

    // Create a fake FileItem with just enough properties for updateCheckState
    const fake_item: FileItem = {
      resourceUri: vscode.Uri.file(file_path),
      label: path.basename(file_path),
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      isDirectory: false,
      checkboxState: state,
      isSymbolicLink: false,
      isOpenFile: true,
      command: undefined,
      iconPath: undefined,
      tooltip: file_path,
      description: '',
      contextValue: 'openEditor',
      isWorkspaceRoot: false
    }

    await this._open_editors_provider.update_check_state(fake_item, state)
  }

  private async update_file_check_state_in_workspace(
    file_path: string,
    checked: boolean
  ): Promise<void> {
    if (!this._workspace_provider || !fs.existsSync(file_path)) return

    const state = checked
      ? vscode.TreeItemCheckboxState.Checked
      : vscode.TreeItemCheckboxState.Unchecked

    const fake_item: FileItem = {
      resourceUri: vscode.Uri.file(file_path),
      label: path.basename(file_path),
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      isDirectory: false,
      checkboxState: state,
      isSymbolicLink: false,
      isOpenFile: false,
      isWorkspaceRoot: false,
      command: undefined,
      iconPath: undefined,
      tooltip: file_path,
      description: '',
      contextValue: 'file'
    }

    await this._workspace_provider.update_check_state(fake_item, state)
  }

  // Update the merged set of checked files by recalculating from both providers
  private update_checked_files_set() {
    if (!this._workspace_provider || !this._open_editors_provider) return

    const workspace_checked_files = this._workspace_provider.get_checked_files()
    const open_editors_checked_files =
      this._open_editors_provider.get_checked_files()

    this._checked_files = new Set([
      ...workspace_checked_files,
      ...open_editors_checked_files
    ])
  }

  get_checked_files(): string[] {
    return Array.from(this._checked_files)
  }

  async update_checked_file(file_path: string, is_checked: boolean) {
    if (is_checked) {
      this._checked_files.add(file_path)
      this._unchecked_in_open_editors.delete(file_path)
      this._unchecked_in_workspace.delete(file_path)
    } else {
      this._checked_files.delete(file_path)
    }

    await this.synchronize_state()
  }

  dispose() {
    this._on_did_change_checked_files.dispose()
  }
}
