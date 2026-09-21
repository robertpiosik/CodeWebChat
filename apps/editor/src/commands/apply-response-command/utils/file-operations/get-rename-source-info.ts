import { FileItem } from '../response-parser'
import { read_rename_source_file } from './read-rename-source-file'
import { resolve_workspace_root } from '../workspace'

export const get_rename_source_info = async (params: {
  file: FileItem
  workspace_map: Map<string, string>
  default_workspace: string
}) => {
  let rename_source_path: string | undefined
  let rename_source_content: string | undefined
  let rename_source_workspace_root: string | undefined

  if (params.file.renamed_from) {
    const old_workspace_root = resolve_workspace_root({
      workspace_name: params.file.renamed_from_workspace,
      workspace_map: params.workspace_map,
      default_workspace: params.default_workspace
    })

    const source_info = await read_rename_source_file({
      renamed_from: params.file.renamed_from,
      workspace_root: old_workspace_root
    })
    if (source_info) {
      rename_source_path = source_info.path
      rename_source_content = source_info.content
      rename_source_workspace_root = old_workspace_root
    }
  }

  return {
    rename_source_path,
    rename_source_content,
    rename_source_workspace_root
  }
}
