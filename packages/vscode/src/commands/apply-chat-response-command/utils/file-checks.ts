import * as vscode from 'vscode'
import * as fs from 'fs'
import { FileItem } from './clipboard-parser'
import { create_safe_path } from '@/utils/path-sanitizer'

export const check_if_all_files_new = async (
  files: FileItem[]
): Promise<boolean> => {
  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders!.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })
  const default_workspace = vscode.workspace.workspaceFolders![0].uri.fsPath

  for (const file of files) {
    let workspace_root = default_workspace
    if (file.workspace_name && workspace_map.has(file.workspace_name)) {
      workspace_root = workspace_map.get(file.workspace_name)!
    }

    const safe_path = create_safe_path(workspace_root, file.file_path)

    if (safe_path && fs.existsSync(safe_path)) {
      return false
    }
  }

  return true
}

export const check_for_conflict_markers = (files: FileItem[]): boolean => {
  for (const file of files) {
    const content = file.content
    if (
      content.includes('<<<<<<<') &&
      content.includes('=======') &&
      content.includes('>>>>>>>')
    ) {
      return true
    }
  }
  return false
}
