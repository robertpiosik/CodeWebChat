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
}) => {
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

      const file_index = results.indexOf(existing_file)
      if (file_index >= 0) {
        const text_indices: number[] = []
        for (let i = file_index + 1; i < results.length; i++) {
          if (results[i].type == 'text') {
            text_indices.push(i)
          }
        }

        if (text_indices.length > 0) {
          const text_contents = text_indices
            .map((idx) => (results[idx] as TextItem).content.trim())
            .filter((c) => c)

          for (let i = text_indices.length - 1; i >= 0; i--) {
            results.splice(text_indices[i], 1)
          }

          if (text_contents.length > 0) {
            const combined = text_contents.join('\n')
            const updated_file_index = results.indexOf(existing_file)
            if (
              updated_file_index > 0 &&
              results[updated_file_index - 1].type == 'text'
            ) {
              const prev_text = results[updated_file_index - 1] as TextItem
              prev_text.content = prev_text.content.trim() + '\n' + combined
            } else {
              results.splice(updated_file_index, 0, {
                type: 'text' as const,
                content: combined
              })
            }
          }
        }
      }
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
}) => {
  const { text_block, results } = params

  if (!text_block.trim()) {
    return
  }

  const content = results.length == 0 ? text_block.trim() : text_block.trimEnd()

  results.push({ type: 'text', content })
}
