import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import {
  FileItem,
  TextItem,
  extract_workspace_and_path,
  has_real_code
} from '../clipboard-parser'
import { parse_file_content_only } from './file-content-only-parser'

const extract_file_path_from_xml = (line: string): string | null => {
  const match = line.match(/<file\s+path=["']([^"']+)["']/)
  return match ? match[1] : null
}

export const parse_multiple_files = (params: {
  response: string
  is_single_root_folder_workspace: boolean
}): (FileItem | TextItem)[] => {
  const file_content_result = parse_file_content_only(params)
  if (file_content_result) {
    return [file_content_result]
  }

  const results: (FileItem | TextItem)[] = []
  const file_ref_map = new Map<string, FileItem>()
  let current_text_block = ''

  let state = 'TEXT'
  let current_file_name = ''
  let current_content = ''
  let is_first_content_line = false
  let current_workspace_name: string | undefined = undefined
  let xml_file_mode = false
  let top_level_xml_file_mode = false
  let in_cdata = false
  let backtick_nesting_level = 0
  let last_seen_file_path_comment: string | null = null
  let is_markdown_container_block = false
  let current_language = ''

  const lines = params.response.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (state == 'TEXT') {
      const backtick_index = line.indexOf('```')
      if (backtick_index != -1) {
        const before_backticks = line.substring(0, backtick_index)

        const extracted_filename = before_backticks.trim()
          ? extract_path_from_line_of_code(before_backticks)
          : null

        if (extracted_filename) {
          last_seen_file_path_comment = extracted_filename
        }

        if (!extracted_filename) {
          current_text_block += before_backticks
        } else {
          // A filename was extracted. Only add to text block if there's other text.
          const trimmed = before_backticks.trim()
          // If it doesn't start with a known comment marker, assume it's text.
          if (!/^\s*(<!--|#|\/\/|\/\*|--)/.test(trimmed)) {
            current_text_block += before_backticks
          }
        }

        if (current_text_block.trim()) {
          results.push({ type: 'text', content: current_text_block.trim() })
        }
        current_text_block = ''

        const after_backticks = line.substring(backtick_index + 3).trim()
        current_language = after_backticks.split(/[:\s{]/)[0]
        if (after_backticks) {
          const name_match = after_backticks.match(
            /(?:path|name)=(?:"([^"]+)"|'([^']+)'|(\S+))/
          )
          if (name_match) {
            const path = name_match[1] || name_match[2] || name_match[3]
            if (path) {
              last_seen_file_path_comment = path
            }
          } else {
            const parts = after_backticks.split(':')
            if (parts.length > 1) {
              const potential_path = parts.slice(1).join(':').trim()
              if (
                potential_path.includes('/') ||
                potential_path.includes('\\') ||
                potential_path.includes('.')
              ) {
                last_seen_file_path_comment = potential_path
              }
            } else {
              let extracted_filename: string | null = null
              const lang_and_path = after_backticks.split(/\s+/)
              if (lang_and_path.length > 1) {
                const potential_path_part = lang_and_path.slice(1).join(' ')
                extracted_filename =
                  extract_path_from_line_of_code(potential_path_part)
              }
              if (!extracted_filename) {
                extracted_filename =
                  extract_path_from_line_of_code(after_backticks)
              }
              if (extracted_filename) {
                last_seen_file_path_comment = extracted_filename
              }
            }
          }
        }

        state = 'CONTENT'
        backtick_nesting_level = 1
        current_workspace_name = undefined
        current_file_name = ''
        if (last_seen_file_path_comment) {
          const { workspace_name, relative_path } = extract_workspace_and_path({
            raw_file_path: last_seen_file_path_comment,
            is_single_root_folder_workspace:
              params.is_single_root_folder_workspace
          })
          current_file_name = relative_path
          if (workspace_name) {
            current_workspace_name = workspace_name
          }
        }
        last_seen_file_path_comment = null
        current_content = ''
        is_first_content_line = true
        xml_file_mode = false
        top_level_xml_file_mode = false
        in_cdata = false
        is_markdown_container_block = false
        continue
      } else if (line.trim().startsWith('<file')) {
        const extracted_filename = extract_file_path_from_xml(line)
        if (extracted_filename) {
          if (current_text_block.trim()) {
            results.push({ type: 'text', content: current_text_block.trim() })
          }
          current_text_block = ''

          state = 'CONTENT'
          top_level_xml_file_mode = true
          const { workspace_name, relative_path } = extract_workspace_and_path({
            raw_file_path: extracted_filename,
            is_single_root_folder_workspace:
              params.is_single_root_folder_workspace
          })
          current_file_name = relative_path
          if (workspace_name) {
            current_workspace_name = workspace_name
          }
          current_content = ''
          last_seen_file_path_comment = null
          continue
        }
      }

      let extracted_filename = extract_path_from_line_of_code(line)
      if (!extracted_filename) {
        const trimmed = line.trim()
        if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
          const potential_path = trimmed.slice(4, -3).trim()
          if (
            potential_path.includes('/') ||
            potential_path.includes('\\') ||
            potential_path.includes('.')
          ) {
            extracted_filename = potential_path
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
            !potential_path.includes(' ') &&
            /[a-zA-Z0-9]/.test(potential_path)
          ) {
            extracted_filename = potential_path
          }
        }
      }

      if (extracted_filename) {
        if (current_text_block.trim()) {
          results.push({ type: 'text', content: current_text_block.trim() })
        }
        current_text_block = ''
        last_seen_file_path_comment = extracted_filename

        const trimmed = line.trim()
        // If it doesn't start with a known comment marker, assume it's text.
        if (!/^\s*(<!--|#|\/\/|\/\*|--)/.test(trimmed)) {
          current_text_block += line + '\n'
        }
      } else {
        if (!last_seen_file_path_comment) {
          current_text_block += line + '\n'
        }
      }
    } else if (state == 'CONTENT') {
      if (top_level_xml_file_mode) {
        if (line.trim().startsWith('</file>')) {
          let final_content = current_content.trim()
          const content_lines = final_content.split('\n')
          if (
            content_lines.length >= 2 &&
            content_lines[0].trim().startsWith('```') &&
            content_lines[content_lines.length - 1].trim() == '```'
          ) {
            final_content = content_lines.slice(1, -1).join('\n')
          }

          state = 'TEXT'

          if (current_file_name && has_real_code(final_content)) {
            const file_key = `${
              current_workspace_name || ''
            }:${current_file_name}`
            if (file_ref_map.has(file_key)) {
              const existing_file = file_ref_map.get(file_key)!
              existing_file.content += '\n\n' + final_content
            } else {
              const new_file = {
                type: 'file' as const,
                file_path: current_file_name,
                content: final_content,
                workspace_name: current_workspace_name
              }
              file_ref_map.set(file_key, new_file)
              results.push(new_file)
            }
          }

          current_file_name = ''
          current_content = ''
          current_workspace_name = undefined
          top_level_xml_file_mode = false
          in_cdata = false
        } else if (line.trim().startsWith('<![CDATA[')) {
          in_cdata = true
        } else if (in_cdata && line.trim().includes(']]>')) {
          in_cdata = false
        } else {
          current_content += (current_content ? '\n' : '') + line
        }
        continue
      }

      const trimmed_line = line.trim()

      if (trimmed_line.startsWith('```') && trimmed_line !== '```') {
        if (
          backtick_nesting_level == 1 &&
          (current_language == 'markdown' || current_language == 'md')
        ) {
          is_first_content_line = true
        }
        backtick_nesting_level++
        if (
          (current_language === 'markdown' || current_language === 'md') &&
          backtick_nesting_level > 1
        ) {
          is_markdown_container_block = true
        }
      } else if (
        trimmed_line == '```' &&
        backtick_nesting_level == 1 &&
        ((current_content.trim() == '' &&
          i > 0 &&
          lines[i - 1].trim() !== '') ||
          ((current_language == 'markdown' || current_language == 'md') &&
            i > 0 &&
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
        if (current_language === 'markdown' || current_language === 'md') {
          is_markdown_container_block = true
        }
        backtick_nesting_level++
      } else if (trimmed_line.endsWith('```')) {
        backtick_nesting_level--
        if (
          backtick_nesting_level == 1 &&
          (current_language == 'markdown' || current_language == 'md')
        ) {
          is_first_content_line = true
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

        if (current_file_name && has_real_code(cleaned_content)) {
          const file_key = `${
            current_workspace_name || ''
          }:${current_file_name}`
          if (file_ref_map.has(file_key)) {
            const existing_file = file_ref_map.get(file_key)!
            existing_file.content += '\n\n' + cleaned_content
          } else {
            const new_file = {
              type: 'file' as const,
              file_path: current_file_name,
              content: cleaned_content,
              workspace_name: current_workspace_name
            }
            file_ref_map.set(file_key, new_file)
            results.push(new_file)
          }
        } else if (!current_file_name) {
          const raw_code_block = [
            `\`\`\`${current_language}`,
            current_content,
            '```'
          ].join('\n')

          const last_result =
            results.length > 0 ? results[results.length - 1] : null
          if (last_result && last_result.type === 'text') {
            last_result.content += '\n' + raw_code_block
          } else {
            results.push({ type: 'text', content: raw_code_block })
          }
        }

        current_file_name = ''
        current_content = ''
        is_first_content_line = false
        current_workspace_name = undefined
        xml_file_mode = false
        in_cdata = false
        if (last_backticks_index !== -1) {
          current_text_block = line.substring(last_backticks_index + 3)
        }
      } else {
        if (is_first_content_line && line.trim().startsWith('<file')) {
          const extracted_filename = extract_file_path_from_xml(line)
          if (extracted_filename) {
            const { workspace_name, relative_path } =
              extract_workspace_and_path({
                raw_file_path: extracted_filename,
                is_single_root_folder_workspace:
                  params.is_single_root_folder_workspace
              })
            current_file_name = relative_path
            if (workspace_name) {
              current_workspace_name = workspace_name
            }
            xml_file_mode = true
            is_first_content_line = false
            continue
          }
        }

        if (is_first_content_line && !xml_file_mode) {
          const trimmed_line = line.trim()
          let extracted_filename: string | null = null

          if (trimmed_line.startsWith('#')) {
            const html_comment_match = trimmed_line.match(
              /<!--\s*(?:file:\/?)?(.*?)\s*-->/
            )
            if (html_comment_match) {
              const potential_path = html_comment_match[1].trim()
              if (
                potential_path.includes('/') ||
                potential_path.includes('\\') ||
                potential_path.includes('.')
              ) {
                extracted_filename = potential_path
              }
            }
          }

          if (extracted_filename) {
            const { workspace_name, relative_path } =
              extract_workspace_and_path({
                raw_file_path: extracted_filename,
                is_single_root_folder_workspace:
                  params.is_single_root_folder_workspace
              })
            current_file_name = relative_path
            if (workspace_name) {
              current_workspace_name = workspace_name
            }

            is_first_content_line = false
            continue
          }

          if (trimmed_line.startsWith('<?php')) {
            if (current_content) {
              current_content += '\n' + line
            } else {
              current_content = line
            }
            continue
          }

          const is_comment =
            trimmed_line.startsWith('//') ||
            trimmed_line.startsWith('#') ||
            trimmed_line.startsWith('/*') ||
            trimmed_line.startsWith('*') ||
            trimmed_line.startsWith('--') ||
            trimmed_line.startsWith('<!--')

          if (is_comment) {
            extracted_filename = extract_path_from_line_of_code(line)
          } else {
            const potential_path = trimmed_line.replace(/\\/g, '/')
            const last_segment = potential_path.split('/').pop()
            if (
              last_segment?.includes('.') &&
              !last_segment?.endsWith('.') &&
              /^[a-zA-Z0-9_./@-]+$/.test(potential_path)
            ) {
              extracted_filename = trimmed_line
            }
          }

          if (extracted_filename) {
            if (current_language == 'markdown' || current_language == 'md') {
              if (current_file_name) {
                const cleaned_content = current_content.trim()
                if (has_real_code(cleaned_content)) {
                  const file_key = `${
                    current_workspace_name || ''
                  }:${current_file_name}`
                  if (file_ref_map.has(file_key)) {
                    const existing_file = file_ref_map.get(file_key)!
                    existing_file.content += '\n\n' + cleaned_content
                  } else {
                    const new_file = {
                      type: 'file' as const,
                      file_path: current_file_name,
                      content: cleaned_content,
                      workspace_name: current_workspace_name
                    }
                    file_ref_map.set(file_key, new_file)
                    results.push(new_file)
                  }
                }
              }
              current_content = ''
            }

            const { workspace_name, relative_path } =
              extract_workspace_and_path({
                raw_file_path: extracted_filename,
                is_single_root_folder_workspace:
                  params.is_single_root_folder_workspace
              })
            current_file_name = relative_path
            if (
              backtick_nesting_level > 1 &&
              (current_language == 'markdown' || current_language == 'md')
            ) {
              current_content = ''
            }

            if (workspace_name) {
              current_workspace_name = workspace_name
            }

            is_first_content_line = false
            continue
          }
        }

        if (line.trim().startsWith('<![CDATA[')) {
          in_cdata = true
          continue
        }

        if (in_cdata && line.trim().includes(']]>')) {
          in_cdata = false
          continue
        }

        if (xml_file_mode && !in_cdata && line.trim() == '</file>') {
          continue
        }

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
            (current_file_name && !is_markdown_container_block)
          ) {
            if (current_content) {
              current_content += '\n' + line
            } else {
              current_content = line
            }
          }
        }

        if (
          is_first_content_line &&
          line.trim() !== '' &&
          !line.trim().startsWith('```')
        ) {
          is_first_content_line = false
        }
      }
    }
  }

  if (state == 'CONTENT' && current_file_name) {
    let cleaned_content = current_content

    if (top_level_xml_file_mode) {
      const final_content = current_content.trim()
      const content_lines = final_content.split('\n')
      if (
        content_lines.length >= 2 &&
        content_lines[0].trim().startsWith('```') &&
        content_lines[content_lines.length - 1].trim() == '```'
      ) {
        cleaned_content = content_lines.slice(1, -1).join('\n')
      } else {
        cleaned_content = final_content
      }
    }

    if (current_file_name && has_real_code(cleaned_content)) {
      const file_key = `${current_workspace_name || ''}:${current_file_name}`
      if (file_ref_map.has(file_key)) {
        const existing_file = file_ref_map.get(file_key)!
        existing_file.content += '\n\n' + cleaned_content
      } else {
        const new_file = {
          type: 'file' as const,
          file_path: current_file_name,
          content: cleaned_content,
          workspace_name: current_workspace_name
        }
        file_ref_map.set(file_key, new_file)
        results.push(new_file)
      }
    }
  } else if (state === 'TEXT' && current_text_block.trim()) {
    results.push({ type: 'text', content: current_text_block.trim() })
  }

  return results
}
