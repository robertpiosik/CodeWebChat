import * as vscode from 'vscode'
import { FileItem } from '../response-parser'
import { resolve_workspace_root } from '../workspace'
import { create_safe_path, sanitize_file_name } from '@/utils/path-sanitizer'

export const prepare_rename_operation = async (params: {
  file: FileItem
  workspace_map: Map<string, string>
  default_workspace: string
}) => {
  let rename_source_path: string | undefined
  let rename_source_workspace_root: string | undefined

  if (params.file.renamed_from) {
    rename_source_workspace_root = resolve_workspace_root({
      workspace_name: params.file.renamed_from_workspace,
      workspace_map: params.workspace_map,
      default_workspace: params.default_workspace
    })
    const sanitized_rename_path = sanitize_file_name(params.file.renamed_from)
    rename_source_path = create_safe_path(rename_source_workspace_root, sanitized_rename_path) ?? undefined
  }

  const is_pure_rename = params.file.content === ''
  let original_content = ''

  if (rename_source_path && rename_source_workspace_root && !is_pure_rename) {
    try {
      const doc = await vscode.workspace.openTextDocument(rename_source_path)
      original_content = doc.getText()
    } catch (e) {
      // Ignored: Will be handled if missing
    }
  }

  return {
    rename_source_path,
    rename_source_workspace_root,
    is_pure_rename,
    original_content
  }
}
