import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import {
  WorkspaceProvider,
  FileItem
} from './providers/workspace/workspace-provider'
import { OpenEditorsProvider } from './providers/open-editors/open-editors-provider'

type ContextState = {
  files: string[]
}

export class SharedContextState {
  private _on_did_change_selected_files = new vscode.EventEmitter<void>()
  readonly onDidChangeSelectedFiles = this._on_did_change_selected_files.event

  private _workspace_provider?: WorkspaceProvider
  private _open_editors_provider?: OpenEditorsProvider

  private _selected_files = new Set<string>()
  private _unselected_in_open_editors = new Set<string>()
  private _unselected_in_workspace = new Set<string>()
  private _undo_stack: ContextState[] = []
  private _redo_stack: ContextState[] = []

  private _synchronizing_provider: 'workspace' | 'openEditors' | null = null
  private _is_synchronizing: boolean = false
  private _is_initialized: boolean = false
  private _is_undoing_redoing: boolean = false

  set_providers(
    workspace_provider: WorkspaceProvider,
    open_editors_provider: OpenEditorsProvider
  ) {
    this._workspace_provider = workspace_provider
    this._open_editors_provider = open_editors_provider

    workspace_provider.onDidChangeSelectedFiles(() => {
      if (!this._is_synchronizing && !this._is_undoing_redoing) {
        this._synchronizing_provider = 'workspace'
        this.synchronize_state()
        this._synchronizing_provider = null
      }
    })

    open_editors_provider.onDidChangeSelectedFiles(() => {
      if (!this._is_synchronizing && !this._is_undoing_redoing) {
        this._synchronizing_provider = 'openEditors'
        this.synchronize_state()
        this._synchronizing_provider = null
      }
    })

    setTimeout(() => {
      if (!this._is_initialized) {
        this.synchronize_state()
        this._is_initialized = true
      }
    }, 1000)
  }

  private push_state(files: string[]) {
    if (!this._is_initialized) return
    this._undo_stack.push({ files })
    if (this._undo_stack.length > 50) this._undo_stack.shift()
    this._redo_stack = []
  }

  async undo() {
    if (this._undo_stack.length == 0) return

    const current_state = {
      files: Array.from(this._selected_files).sort()
    }
    this._redo_stack.push(current_state)

    const previous_state = this._undo_stack.pop()
    if (previous_state) {
      this._is_undoing_redoing = true
      await this.apply_state(previous_state)
      this._is_undoing_redoing = false
    }
  }

  async redo() {
    if (this._redo_stack.length == 0) return

    const current_state = {
      files: Array.from(this._selected_files).sort()
    }
    this._undo_stack.push(current_state)

    const next_state = this._redo_stack.pop()
    if (next_state) {
      this._is_undoing_redoing = true
      await this.apply_state(next_state)
      this._is_undoing_redoing = false
    }
  }

  async apply_state(state: ContextState) {
    if (this._workspace_provider) {
      await this._workspace_provider.set_selected_files(state.files)
    }
    if (this._open_editors_provider) {
      await this._open_editors_provider.set_selected_files(state.files)
    }

    this.update_selected_files_set()

    this._on_did_change_selected_files.fire()
  }

  async synchronize_state() {
    if (!this._workspace_provider || !this._open_editors_provider) return
    if (this._is_synchronizing) return

    const prev_files = Array.from(this._selected_files).sort()

    this._is_synchronizing = true

    try {
      const workspace_selected_files =
        this._workspace_provider.get_selected_files()
      const open_editors_selected_files =
        this._open_editors_provider.get_selected_files()

      const open_editor_uris = this.get_open_editor_uris()
      const open_editor_paths = open_editor_uris.map((uri) => uri.fsPath)

      if (this._synchronizing_provider == 'workspace') {
        for (const file of open_editor_paths) {
          const is_selected_in_workspace =
            this.is_file_selected_in_workspace(file)
          const is_selected_in_open_editors =
            open_editors_selected_files.includes(file)

          if (is_selected_in_workspace !== is_selected_in_open_editors) {
            await this.update_file_in_open_editors(
              file,
              is_selected_in_workspace
            )

            if (is_selected_in_workspace) {
              this._unselected_in_open_editors.delete(file)
            } else {
              // Only track as explicitly unselected if it was selected before
              if (open_editors_selected_files.includes(file)) {
                this._unselected_in_open_editors.add(file)
              }
            }
          }
        }
      } else if (this._synchronizing_provider == 'openEditors') {
        const open_editor_paths_set = new Set(open_editor_paths)

        const preserved_workspace_selected_files =
          workspace_selected_files.filter(
            (file) => !open_editor_paths_set.has(file)
          )

        const new_workspace_selected_files = [
          ...preserved_workspace_selected_files,
          ...open_editors_selected_files
        ]

        await this._workspace_provider.set_selected_files(
          new_workspace_selected_files
        )
      } else {
        for (const file of open_editor_paths) {
          const is_selected_in_workspace =
            this.is_file_selected_in_workspace(file)
          const is_selected_in_open_editors =
            open_editors_selected_files.includes(file)

          if (is_selected_in_workspace !== is_selected_in_open_editors) {
            await this.update_file_in_open_editors(
              file,
              is_selected_in_workspace
            )
          }
        }

        for (const file of open_editors_selected_files) {
          if (!workspace_selected_files.includes(file)) {
            await this.update_file_checkbox_state_in_workspace(file, true)
          }
        }
      }

      this.update_selected_files_set()

      this._on_did_change_selected_files.fire()

      const curr_files = Array.from(this._selected_files).sort()

      if (!this._is_undoing_redoing && this._is_initialized) {
        if (JSON.stringify(prev_files) !== JSON.stringify(curr_files)) {
          this.push_state(prev_files)
        }
      }
    } finally {
      this._is_synchronizing = false
    }
  }

  private is_file_selected_in_workspace(file_path: string): boolean {
    if (!this._workspace_provider) return false

    const workspace_selected_files =
      this._workspace_provider.get_selected_files()

    if (workspace_selected_files.includes(file_path)) {
      return true
    }

    const workspace_root =
      this._workspace_provider.get_workspace_root_for_file(file_path)
    if (!workspace_root) {
      return false
    }

    let current_dir = path.dirname(file_path)
    while (current_dir.startsWith(workspace_root)) {
      if (workspace_selected_files.includes(current_dir)) {
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

    const fake_item: FileItem = {
      resourceUri: vscode.Uri.file(file_path),
      label: path.basename(file_path),
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      isDirectory: false,
      checkboxState: state,
      isSymbolicLink: false,
      isOpenFile: true,
      tokenCount: 0,
      shrinkTokenCount: 0,
      command: undefined,
      iconPath: undefined,
      tooltip: file_path,
      description: '',
      contextValue: 'openEditor',
      isWorkspaceRoot: false
    }

    await this._open_editors_provider.update_checkbox_state(fake_item, state)
  }

  private async update_file_checkbox_state_in_workspace(
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
      tokenCount: 0,
      shrinkTokenCount: 0,
      isWorkspaceRoot: false,
      command: undefined,
      iconPath: undefined,
      tooltip: file_path,
      description: '',
      contextValue: 'file'
    }

    await this._workspace_provider.update_checkbox_state(fake_item, state)
  }

  private update_selected_files_set() {
    if (!this._workspace_provider || !this._open_editors_provider) return

    const workspace_selected_files =
      this._workspace_provider.get_selected_files()
    const open_editors_selected_files =
      this._open_editors_provider.get_selected_files()

    this._selected_files = new Set([
      ...workspace_selected_files,
      ...open_editors_selected_files
    ])
  }

  get_selected_files(): string[] {
    return Array.from(this._selected_files)
  }

  async update_checked_file(file_path: string, is_checked: boolean) {
    if (is_checked) {
      this._selected_files.add(file_path)
      this._unselected_in_open_editors.delete(file_path)
      this._unselected_in_workspace.delete(file_path)
    } else {
      this._selected_files.delete(file_path)
    }

    await this.synchronize_state()
  }

  dispose() {
    this._on_did_change_selected_files.dispose()
  }
}
