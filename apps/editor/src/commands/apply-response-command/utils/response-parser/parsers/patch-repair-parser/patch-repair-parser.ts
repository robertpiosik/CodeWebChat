import { cleanup_api_response } from '@/utils/cleanup-api-response'
import {
  PatchRepairItem,
  TextItem,
  extract_workspace_and_path
} from '../../response-parser'

const extract_path = (line: string): string | null => {
  const match = line.match(
    /^###\s+Patch(?:ed)?\s+(?:repair|file):\s*`?([^`]+)`?/i
  )
  if (match && match[1]) {
    return match[1].trim()
  }
  return null
}

export const parse_patch_repair = (params: {
  response: string
  is_single_root_folder_workspace: boolean
}): (PatchRepairItem | TextItem)[] | null => {
  const lines = params.response.split('\n')
  const results: (PatchRepairItem | TextItem)[] = []
  let found_any = false

  let current_text: string[] = []

  let i = 0
  while (i < lines.length) {
    const extracted = extract_path(lines[i])
    if (extracted) {
      let code_block_start_index = -1
      let code_block_end_index = -1

      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim().startsWith('```')) {
          code_block_start_index = j
          for (let k = j + 1; k < lines.length; k++) {
            if (lines[k].trim().startsWith('```')) {
              code_block_end_index = k
              break
            }
          }
          break
        }
      }

      if (code_block_start_index !== -1) {
        if (code_block_end_index === -1) {
          code_block_end_index = lines.length - 1
        }

        found_any = true

        if (current_text.length > 0) {
          const text_content = current_text.join('\n').trim()
          if (text_content) {
            results.push({ type: 'text', content: text_content })
          }
          current_text = []
        }

        const { workspace_name, relative_path } = extract_workspace_and_path({
          raw_file_path: extracted,
          is_single_root_folder_workspace:
            params.is_single_root_folder_workspace
        })

        const content_lines = lines.slice(
          code_block_start_index + 1,
          code_block_end_index
        )

        results.push({
          type: 'patch-repair',
          file_path: relative_path,
          content: cleanup_api_response({ content: content_lines.join('\n') }),
          workspace_name
        })

        i = code_block_end_index + 1
        continue
      }
    }

    current_text.push(lines[i])
    i++
  }

  if (!found_any) {
    return null
  }

  if (current_text.length > 0) {
    const text_content = current_text.join('\n').trim()
    if (text_content) {
      results.push({ type: 'text', content: text_content })
    }
  }

  return results
}
