import { FileItem, TextItem, InlineFileItem } from '../../../clipboard-parser'
import { process_conflict_markers } from './text-processing'

export const create_or_update_file_item = (params: {
  file_name: string
  content: string
  workspace_name: string | undefined
  file_ref_map: Map<string, FileItem>
  results: (FileItem | TextItem | InlineFileItem)[]
  mode?: 'overwrite' | 'append'
  renamed_from?: string
  is_deleted?: boolean
}): void => {
  const {
    file_name,
    content,
    workspace_name,
    file_ref_map,
    results,
    mode = 'overwrite',
    renamed_from,
    is_deleted
  } = params

  if (!file_name) {
    return
  }

  const processed_content = process_conflict_markers(content)

  const file_key = `${workspace_name || ''}:${file_name}`

  if (file_ref_map.has(file_key)) {
    const existing_file = file_ref_map.get(file_key)!

    if (mode == 'append') {
      existing_file.content = existing_file.content + '\n' + processed_content
    } else {
      existing_file.content = processed_content
    }

    if (renamed_from) {
      existing_file.renamed_from = renamed_from
    }

    if (is_deleted !== undefined) {
      existing_file.is_deleted = is_deleted
    }
  } else {
    const new_file: FileItem = {
      type: 'file' as const,
      file_path: file_name,
      content: processed_content,
      workspace_name: workspace_name,
      renamed_from,
      is_deleted
    }
    file_ref_map.set(file_key, new_file)
    results.push(new_file)
  }
}

export const flush_text_block = (params: {
  text_block: string
  results: (FileItem | TextItem | InlineFileItem)[]
}): void => {
  const { text_block, results } = params

  if (!text_block.trim()) {
    return
  }

  const content = results.length == 0 ? text_block.trim() : text_block.trimEnd()

  results.push({ type: 'text', content })
}
