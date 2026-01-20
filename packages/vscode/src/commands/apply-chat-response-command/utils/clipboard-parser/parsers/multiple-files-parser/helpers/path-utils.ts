import { extract_workspace_and_path } from '../../../clipboard-parser'

export const extract_and_set_workspace_path = (params: {
  raw_file_path: string
  is_single_root_folder_workspace: boolean
}): { workspace_name: string | undefined; relative_path: string } => {
  const { workspace_name, relative_path } = extract_workspace_and_path({
    raw_file_path: params.raw_file_path,
    is_single_root_folder_workspace: params.is_single_root_folder_workspace
  })
  return { workspace_name, relative_path }
}
