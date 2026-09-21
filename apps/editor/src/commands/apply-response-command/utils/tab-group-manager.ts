import * as vscode from 'vscode'

export interface SavedEditorState {
  uri: string
  view_column: vscode.ViewColumn
  is_active: boolean
}

export interface SavedTabGroups {
  editors: SavedEditorState[]
  active_editor_uri?: string
}

export const capture_tab_groups = (): SavedTabGroups => {
  const saved_tab_groups: SavedTabGroups = {
    editors: [],
    active_editor_uri: vscode.window.activeTextEditor?.document.uri.toString()
  }

  for (const tab_group of vscode.window.tabGroups.all) {
    for (const tab of tab_group.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        saved_tab_groups.editors.push({
          uri: tab.input.uri.toString(),
          view_column: tab_group.viewColumn,
          is_active: tab.isActive
        })
      }
    }
  }

  return saved_tab_groups
}

export const restore_tab_groups = async (
  saved_state: SavedTabGroups
): Promise<void> => {
  try {
    const current_editors: SavedEditorState[] = []
    for (const tab_group of vscode.window.tabGroups.all) {
      for (const tab of tab_group.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          current_editors.push({
            uri: tab.input.uri.toString(),
            view_column: tab_group.viewColumn,
            is_active: tab.isActive
          })
        }
      }
    }

    const are_states_equal =
      current_editors.length == saved_state.editors.length &&
      current_editors.every((editor) =>
        saved_state.editors.some((saved) => saved.uri == editor.uri)
      )

    if (are_states_equal) {
      if (saved_state.active_editor_uri) {
        const current_active_uri =
          vscode.window.activeTextEditor?.document.uri.toString()
        if (current_active_uri != saved_state.active_editor_uri) {
          try {
            const active_uri = vscode.Uri.parse(saved_state.active_editor_uri)
            await vscode.window.showTextDocument(active_uri, {
              preserveFocus: false
            })
          } catch (error) {
            console.error('Failed to restore active editor focus:', error)
          }
        }
      }
      return
    }

    if (current_editors.length > saved_state.editors.length) {
      const tabs_to_close: vscode.Tab[] = []
      for (const tab_group of vscode.window.tabGroups.all) {
        for (const tab of tab_group.tabs) {
          if (tab.input instanceof vscode.TabInputText) {
            const uri = tab.input.uri.toString()
            const is_saved = saved_state.editors.some(
              (saved) =>
                saved.uri == uri && saved.view_column == tab_group.viewColumn
            )
            if (!is_saved) {
              tabs_to_close.push(tab)
            }
          }
        }
      }
      if (tabs_to_close.length > 0) {
        await vscode.window.tabGroups.close(tabs_to_close)
      }
    } else {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors')

      for (const editor of saved_state.editors) {
        try {
          const uri = vscode.Uri.parse(editor.uri)
          await vscode.window.showTextDocument(uri, {
            viewColumn: editor.view_column,
            preview: false,
            preserveFocus: !editor.is_active
          })
        } catch (error) {
          console.error(`Failed to restore editor for ${editor.uri}:`, error)
        }
      }
    }

    if (saved_state.active_editor_uri) {
      try {
        const active_uri = vscode.Uri.parse(saved_state.active_editor_uri)
        await vscode.window.showTextDocument(active_uri, {
          preserveFocus: false
        })
      } catch (error) {
        console.error('Failed to restore active editor:', error)
      }
    }
  } catch (error) {
    console.error('Failed to restore tab groups:', error)
  }
}
