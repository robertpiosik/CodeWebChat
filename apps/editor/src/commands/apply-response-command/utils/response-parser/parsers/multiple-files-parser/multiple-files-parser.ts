import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import { FileItem, TextItem, InlineFileItem } from '../../response-parser'
import {
  extract_and_set_workspace_path,
  create_or_update_file_item,
  flush_text_block
} from './helpers'

export const parse_multiple_files = (params: {
  response: string
  is_single_root_folder_workspace: boolean
}): (FileItem | TextItem | InlineFileItem)[] => {
  const results: (FileItem | TextItem | InlineFileItem)[] = []
  const file_ref_map = new Map<string, FileItem>()
  let current_text_block = ''

  let state = 'TEXT'
  let renamed_from_path: string | undefined = undefined
  let renamed_from_workspace: string | undefined = undefined
  let current_file_name = ''
  let current_content = ''
  let current_workspace_name: string | undefined = undefined
  let backtick_nesting_level = 0
  let last_seen_file_path_comment: string | null = null
  let last_seen_file_path_was_header = false
  let last_seen_header_was_persistent = false
  let header_path_already_used = false
  let current_block_mode: 'overwrite' | 'append' = 'overwrite'
  let is_markdown_container_block = false
  let current_language = ''

  const lines = params.response.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (state == 'TEXT') {
      const backtick_index = line.indexOf('```')
      if (backtick_index != -1) {
        const before_backticks = line.substring(0, backtick_index)

        current_block_mode = 'overwrite'

        current_text_block += before_backticks

        flush_text_block({
          text_block: current_text_block,
          results
        })
        current_text_block = ''

        const after_backticks = line.substring(backtick_index + 3).trim()
        current_language = after_backticks.split(/[:\s{]/)[0]

        state = 'CONTENT'
        backtick_nesting_level = 1
        current_workspace_name = undefined
        current_file_name = ''
        if (last_seen_file_path_comment) {
          const { workspace_name, relative_path } =
            extract_and_set_workspace_path({
              raw_file_path: last_seen_file_path_comment,
              is_single_root_folder_workspace:
                params.is_single_root_folder_workspace
            })
          current_file_name = relative_path
          if (workspace_name) {
            current_workspace_name = workspace_name
          }

          if (last_seen_file_path_was_header) {
            if (header_path_already_used && !last_seen_header_was_persistent) {
              current_file_name = ''
              current_workspace_name = undefined
              last_seen_file_path_comment = null
            } else if (header_path_already_used) {
              const file_key = `${current_workspace_name || ''}:${current_file_name}`
              const existing_file = file_ref_map.get(file_key)
              const has_conflict_markers =
                existing_file &&
                existing_file.content.includes('<<<<<<<') &&
                existing_file.content.includes('>>>>>>>') &&
                existing_file.content.includes('=======')

              if (has_conflict_markers) {
                current_block_mode = 'append'
              } else {
                current_file_name = ''
                current_workspace_name = undefined
                last_seen_file_path_comment = null
                current_block_mode = 'overwrite'
              }
            } else {
              const file_key = `${current_workspace_name || ''}:${current_file_name}`
              const existing_file = file_ref_map.get(file_key)
              const has_conflict_markers =
                existing_file &&
                existing_file.content.includes('<<<<<<<') &&
                existing_file.content.includes('>>>>>>>') &&
                existing_file.content.includes('=======')

              if (has_conflict_markers) {
                current_block_mode = 'append'
              } else {
                current_block_mode = 'overwrite'
              }
              header_path_already_used = true
            }
          } else {
            current_block_mode = 'overwrite'
            last_seen_file_path_comment = null
          }
        }
        current_content = ''
        is_markdown_container_block = false
        continue
      }

      const renamed_file_match = line
        .trim()
        .match(/^###\s+Renamed file:\s*`([^`]+)`.*?`([^`]+)`/i)
      if (
        renamed_file_match &&
        renamed_file_match[1] &&
        renamed_file_match[2]
      ) {
        flush_text_block({
          text_block: current_text_block,
          results
        })
        current_text_block = ''
        const { relative_path, workspace_name: old_workspace_name } =
          extract_and_set_workspace_path({
            raw_file_path: renamed_file_match[1],
            is_single_root_folder_workspace:
              params.is_single_root_folder_workspace
          })

        renamed_from_path = relative_path
        renamed_from_workspace = old_workspace_name

        const {
          relative_path: new_relative_path,
          workspace_name: new_workspace_name
        } = extract_and_set_workspace_path({
          raw_file_path: renamed_file_match[2],
          is_single_root_folder_workspace:
            params.is_single_root_folder_workspace
        })

        create_or_update_file_item({
          file_name: new_relative_path,
          content: '',
          workspace_name: new_workspace_name,
          file_ref_map,
          results,
          renamed_from: renamed_from_path,
          renamed_from_workspace
        })

        last_seen_file_path_comment = renamed_file_match[2]
        last_seen_file_path_was_header = true
        last_seen_header_was_persistent = true
        header_path_already_used = false

        continue
      }

      const deleted_file_match = line
        .trim()
        .match(/^###\s+Deleted file:\s*`([^`]+)`$/i)
      if (deleted_file_match && deleted_file_match[1]) {
        renamed_from_path = undefined
        renamed_from_workspace = undefined
        flush_text_block({
          text_block: current_text_block,
          results
        })
        current_text_block = ''
        const { workspace_name, relative_path } =
          extract_and_set_workspace_path({
            raw_file_path: deleted_file_match[1],
            is_single_root_folder_workspace:
              params.is_single_root_folder_workspace
          })
        create_or_update_file_item({
          file_name: relative_path,
          content: '',
          workspace_name,
          file_ref_map,
          results,
          is_deleted: true
        })
        continue
      }

      let extracted_filename = extract_path_from_line_of_code(line)
      const is_header_line = line.trim().startsWith('###')

      if (!extracted_filename) {
        if (is_header_line) {
          const header_content = line.trim().replace(/^###\s+/, '')
          const cleaned = header_content.replace(/^[`*]+|[`*]+$/g, '')
          const extracted = extract_path_from_line_of_code(cleaned)
          if (extracted) {
            extracted_filename = extracted
          } else if (
            (cleaned.includes('/') ||
              cleaned.includes('.') ||
              cleaned.includes('\\')) &&
            !cleaned.includes(' ')
          ) {
            extracted_filename = cleaned
          }
        }
      }
      if (!extracted_filename) {
        const match = line.match(/`([^`]+)`/)
        if (match && match[1]) {
          const potential_path = match[1]
          if (
            (potential_path.includes('/') ||
              potential_path.includes('\\') ||
              potential_path.includes('.')) &&
            !potential_path.includes('${') &&
            !potential_path.includes(' ') &&
            /[a-zA-Z0-9]/.test(potential_path)
          ) {
            const before = line.substring(0, match.index!)
            const after = line.substring(match.index! + match[0].length)

            // Avoid matching file paths that are part of a sentence.
            if (
              is_header_line ||
              !(/[a-zA-Z]/.test(before) && /[a-zA-Z]/.test(after))
            ) {
              const trimmed_line = line.trim()
              const is_comment_or_header =
                trimmed_line.startsWith('#') ||
                trimmed_line.startsWith('//') ||
                trimmed_line.startsWith('--')
              let is_followed_by_code_block = false
              for (let j = i + 1; j < lines.length; j++) {
                const next_line = lines[j].trim()
                if (next_line.startsWith('```')) {
                  if (is_comment_or_header) {
                    is_followed_by_code_block = true
                  } else {
                    let all_intermediate_lines_empty = true
                    for (let k = i + 1; k < j; k++) {
                      if (lines[k].trim() != '') {
                        all_intermediate_lines_empty = false
                        break
                      }
                    }
                    if (all_intermediate_lines_empty) {
                      is_followed_by_code_block = true
                    }
                  }
                  break
                }
              }

              if (is_followed_by_code_block) {
                extracted_filename = potential_path
              }
            }
          }
        }
      }

      if (extracted_filename) {
        if (last_seen_file_path_was_header && !is_header_line) {
          current_text_block += line + '\n'
        } else {
          flush_text_block({
            text_block: current_text_block,
            results
          })
          current_text_block = ''
          last_seen_file_path_comment = extracted_filename
          if (!line.trim().match(/^###\s+Renamed file:/i)) {
            renamed_from_path = undefined
            renamed_from_workspace = undefined
          }

          last_seen_file_path_was_header = is_header_line
          if (is_header_line) {
            last_seen_header_was_persistent = /updated|new|renamed/i.test(line)
          }
          header_path_already_used = false
        }
      } else {
        let is_lone_path_on_this_line = false
        if (!last_seen_file_path_comment) {
          let trimmed = line.trim()

          const markdown_markers = ['***', '**', '*']
          for (const marker of markdown_markers) {
            if (trimmed.startsWith(marker) && trimmed.endsWith(marker)) {
              trimmed = trimmed.slice(marker.length, -marker.length)
              break
            }
          }

          if (trimmed.endsWith(':')) {
            trimmed = trimmed.slice(0, -1)
          }

          if (
            trimmed &&
            (trimmed.includes('/') ||
              trimmed.includes('\\') ||
              trimmed.includes('.')) &&
            !trimmed.endsWith('.') &&
            /^[a-zA-Z0-9_./@-]+$/.test(trimmed)
          ) {
            let is_followed_by_code_block = false
            for (let j = i + 1; j < lines.length; j++) {
              const next_line = lines[j].trim()
              if (next_line.startsWith('```')) {
                is_followed_by_code_block = true
                break
              }
            }
            if (is_followed_by_code_block) {
              renamed_from_path = undefined
              renamed_from_workspace = undefined
              last_seen_file_path_comment = trimmed
              last_seen_file_path_was_header = false
              header_path_already_used = false
              is_lone_path_on_this_line = true
            }
          }
        }
        if (!is_lone_path_on_this_line) {
          current_text_block += line + '\n'
        }
      }
    } else if (state == 'CONTENT') {
      const trimmed_line = line.trim()

      if (trimmed_line.startsWith('```') && trimmed_line != '```') {
        if (
          backtick_nesting_level == 1 &&
          current_file_name &&
          current_content.trim() == ''
        ) {
          state = 'TEXT'
          last_seen_file_path_comment = current_file_name
          current_file_name = ''
          current_content = ''
          current_workspace_name = undefined
          i--
          continue
        }

        backtick_nesting_level++
        if (
          (current_language == 'markdown' || current_language == 'md') &&
          backtick_nesting_level > 1
        ) {
          is_markdown_container_block = true
        }
      } else if (
        trimmed_line == '```' &&
        backtick_nesting_level == 1 &&
        current_content.trim() == '' &&
        i > 0 &&
        lines[i - 1].trim() != '' &&
        lines[i - 1].trim().startsWith('```') &&
        (() => {
          for (let j = i + 1; j < lines.length; j++) {
            const next_line = lines[j].trim()
            if (next_line) return true
          }
          return false
        })()
      ) {
        backtick_nesting_level++
      } else if (
        trimmed_line == '```' &&
        backtick_nesting_level == 1 &&
        (current_language == 'markdown' || current_language == 'md') &&
        !last_seen_file_path_was_header &&
        ((current_content.trim() == '' && i > 0 && lines[i - 1].trim() != '') ||
          (i > 0 &&
            (lines[i - 1].trim() == '' ||
              (current_file_name.endsWith('.md') &&
                lines[i - 1].trim().endsWith('```'))))) &&
        (() => {
          for (let j = i + 1; j < lines.length; j++) {
            const next_line = lines[j].trim()
            if (next_line) return true
          }
          return false
        })()
      ) {
        is_markdown_container_block = true
        backtick_nesting_level++
      } else if (trimmed_line.endsWith('```')) {
        let should_close = true
        if (
          trimmed_line == '```' &&
          backtick_nesting_level == 1 &&
          current_file_name &&
          current_content.trim() == '' &&
          i + 1 < lines.length &&
          lines[i + 1].trim() != '' &&
          !lines[i + 1].trim().startsWith('```')
        ) {
          should_close = false
        }

        if (should_close) {
          backtick_nesting_level--
        } else {
          backtick_nesting_level++
        }
      }

      if (backtick_nesting_level <= 0) {
        let content_on_closing_line = ''
        const last_backticks_index = line.lastIndexOf('```')
        if (last_backticks_index !== -1) {
          content_on_closing_line = line.substring(0, last_backticks_index)
        }

        if (content_on_closing_line.trim() != '') {
          if (current_content) {
            current_content += '\n' + content_on_closing_line
          } else {
            current_content = content_on_closing_line
          }
        }

        state = 'TEXT'

        const cleaned_content = current_content

        if (current_block_mode == 'append' && current_file_name) {
          const file_key = `${current_workspace_name || ''}:${current_file_name}`
          const existing_file = file_ref_map.get(file_key)
          if (
            existing_file &&
            existing_file.content.includes('<<<<<<<') &&
            !cleaned_content.includes('<<<<<<<')
          ) {
            current_file_name = ''
            current_workspace_name = undefined
          }
        }

        create_or_update_file_item({
          file_name: current_file_name,
          content: cleaned_content,
          workspace_name: current_workspace_name,
          file_ref_map,
          results,
          mode: current_block_mode,
          renamed_from: renamed_from_path,
          renamed_from_workspace
        })

        renamed_from_path = undefined
        renamed_from_workspace = undefined
        if (!current_file_name) {
          results.push({
            type: 'inline-file',
            content: current_content,
            language: current_language
          })
        }

        if (current_file_name && !current_content.trim()) {
          last_seen_file_path_comment = current_file_name
          last_seen_file_path_was_header = false
          last_seen_header_was_persistent = false
          header_path_already_used = false
        }

        current_file_name = ''
        current_content = ''
        current_workspace_name = undefined
        if (last_backticks_index != -1) {
          current_text_block = line.substring(last_backticks_index + 3)
        }
      } else {
        const lang_is_markdown =
          current_language == 'markdown' || current_language == 'md'

        const is_markdown_file = current_file_name.endsWith('.md')

        if (
          is_markdown_file ||
          !(
            lang_is_markdown &&
            current_file_name &&
            line.trim().startsWith('```')
          )
        ) {
          if (
            !lang_is_markdown ||
            is_markdown_file ||
            backtick_nesting_level > 1 ||
            (current_file_name && !is_markdown_container_block) ||
            !current_file_name
          ) {
            if (current_content) {
              current_content += '\n' + line
            } else {
              current_content = line
            }
          }
        }
      }
    }
  }

  if (state == 'CONTENT' && current_file_name) {
    create_or_update_file_item({
      file_name: current_file_name,
      content: current_content,
      workspace_name: current_workspace_name,
      file_ref_map,
      results,
      mode: current_block_mode,
      renamed_from: renamed_from_path,
      renamed_from_workspace
    })
  } else if (state == 'TEXT' && current_text_block.trim()) {
    renamed_from_path = undefined
    renamed_from_workspace = undefined
    flush_text_block({
      text_block: current_text_block,
      results
    })
  }

  const merged_results: (FileItem | TextItem | InlineFileItem)[] = []
  for (const result of results) {
    if (merged_results.length > 0) {
      const last = merged_results[merged_results.length - 1]
      if (last.type == 'text' && result.type == 'text') {
        last.content += '\n' + result.content
        continue
      }
    }
    merged_results.push(result)
  }

  for (const result of merged_results) {
    if (result.type == 'text') {
      result.content = result.content.trim()
    }
  }

  return merged_results
}
