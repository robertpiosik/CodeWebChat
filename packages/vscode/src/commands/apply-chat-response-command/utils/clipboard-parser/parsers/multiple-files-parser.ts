import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import {
  FileItem,
  TextItem,
  extract_workspace_and_path,
  has_real_code
} from '../clipboard-parser'
import { parse_file_content_only } from './file-content-only-parser'

const extract_file_path_from_xml = (
  line: string
): { tagName: string; path: string } | null => {
  const match = line.match(/<([\w-]+)\s+path=["']([^"']+)["']/)
  if (match && match[1] && match[2]) {
    return { tagName: match[1], path: match[2] }
  }
  return null
}

const extract_and_set_workspace_path = (params: {
  raw_file_path: string
  is_single_root_folder_workspace: boolean
}): { workspace_name: string | undefined; relative_path: string } => {
  const { workspace_name, relative_path } = extract_workspace_and_path({
    raw_file_path: params.raw_file_path,
    is_single_root_folder_workspace: params.is_single_root_folder_workspace
  })
  return { workspace_name, relative_path }
}

const strip_markdown_code_block = (content: string): string => {
  const trimmed = content.trim()
  const lines = trimmed.split('\n')

  if (
    lines.length >= 2 &&
    lines[0].trim().startsWith('```') &&
    lines[lines.length - 1].trim() === '```'
  ) {
    return lines.slice(1, -1).join('\n')
  }

  return trimmed
}

const create_or_update_file_item = (params: {
  file_name: string
  content: string
  workspace_name: string | undefined
  file_ref_map: Map<string, FileItem>
  results: (FileItem | TextItem)[]
}): void => {
  const { file_name, content, workspace_name, file_ref_map, results } = params

  if (!file_name) {
    return
  }

  const file_key = `${workspace_name || ''}:${file_name}`

  if (file_ref_map.has(file_key)) {
    const existing_file = file_ref_map.get(file_key)!
    const had_content_before = has_real_code(existing_file.content)
    existing_file.content = content
    const has_content_now = has_real_code(content)

    if (!had_content_before && has_content_now) {
      const index = results.indexOf(existing_file)
      if (index > -1) {
        results.splice(index, 1)
        results.push(existing_file)
      }
    }
  } else {
    const new_file: FileItem = {
      type: 'file' as const,
      file_path: file_name,
      content: content,
      workspace_name: workspace_name
    }
    file_ref_map.set(file_key, new_file)
    results.push(new_file)
  }
}

const flush_text_block = (params: {
  text_block: string
  results: (FileItem | TextItem)[]
}): void => {
  const { text_block, results } = params

  if (!text_block.trim()) {
    return
  }

  const content = results.length == 0 ? text_block.trim() : text_block.trimEnd()

  results.push({ type: 'text', content })
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
  let last_seen_file_path_was_header = false
  let is_markdown_container_block = false
  let current_language = ''
  let current_xml_tag: string | null = null
  let current_file_name_was_comment = false

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
          last_seen_file_path_was_header = false
        }

        if (!extracted_filename) {
          current_text_block += before_backticks
        }

        flush_text_block({
          text_block: current_text_block,
          results
        })
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
              last_seen_file_path_was_header = false
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
                last_seen_file_path_was_header = false
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
                last_seen_file_path_was_header = false
              }
            }
          }
        }

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
          current_file_name_was_comment = false
        }
        last_seen_file_path_comment = null
        current_content = ''
        is_first_content_line = true
        xml_file_mode = false
        top_level_xml_file_mode = false
        in_cdata = false
        is_markdown_container_block = false
        continue
      } else if (line.trim().startsWith('<')) {
        const xml_info = extract_file_path_from_xml(line)
        if (xml_info) {
          flush_text_block({
            text_block: current_text_block,
            results
          })
          current_text_block = ''

          state = 'CONTENT'
          current_xml_tag = xml_info.tagName
          top_level_xml_file_mode = true
          const { workspace_name, relative_path } =
            extract_and_set_workspace_path({
              raw_file_path: xml_info.path,
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
        const { workspace_name, relative_path } =
          extract_and_set_workspace_path({
            raw_file_path: renamed_file_match[1],
            is_single_root_folder_workspace:
              params.is_single_root_folder_workspace
          })
        create_or_update_file_item({
          file_name: relative_path,
          content: '',
          workspace_name,
          file_ref_map,
          results
        })

        last_seen_file_path_comment = renamed_file_match[2]
        last_seen_file_path_was_header = true
        continue
      }

      const deleted_file_match = line
        .trim()
        .match(/^###\s+Deleted file:\s*`([^`]+)`$/i)
      if (deleted_file_match && deleted_file_match[1]) {
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
          results
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
            !potential_path.includes('${') &&
            !potential_path.includes(' ') &&
            /[a-zA-Z0-9]/.test(potential_path)
          ) {
            const before = line.substring(0, match.index!)
            const after = line.substring(match.index! + match[0].length)

            // Avoid matching file paths that are part of a sentence.
            if (!(/[a-zA-Z]/.test(before) && /[a-zA-Z]/.test(after))) {
              const trimmed_line = line.trim()
              const is_comment_or_header =
                trimmed_line.startsWith('#') ||
                trimmed_line.startsWith('//') ||
                trimmed_line.startsWith('/*') ||
                trimmed_line.startsWith('*') ||
                trimmed_line.startsWith('--') ||
                trimmed_line.startsWith('<!--')
              let is_followed_by_code_block = false
              for (let j = i + 1; j < lines.length; j++) {
                const next_line = lines[j].trim()
                if (next_line.startsWith('```')) {
                  if (is_comment_or_header) {
                    is_followed_by_code_block = true
                  } else {
                    let all_intermediate_lines_empty = true
                    for (let k = i + 1; k < j; k++) {
                      if (lines[k].trim() !== '') {
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
          last_seen_file_path_was_header = is_header_line
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
              last_seen_file_path_comment = trimmed
              last_seen_file_path_was_header = false
              is_lone_path_on_this_line = true
            }
          }
        }
        if (!is_lone_path_on_this_line) {
          current_text_block += line + '\n'
        }
      }
    } else if (state == 'CONTENT') {
      if (top_level_xml_file_mode) {
        if (line.trim().startsWith(`</${current_xml_tag}>`)) {
          const final_content = strip_markdown_code_block(current_content)

          state = 'TEXT'

          create_or_update_file_item({
            file_name: current_file_name,
            content: final_content,
            workspace_name: current_workspace_name,
            file_ref_map,
            results
          })

          current_file_name = ''
          current_content = ''
          current_workspace_name = undefined
          top_level_xml_file_mode = false
          in_cdata = false
          current_xml_tag = null
        } else if (line.trim().startsWith('<![CDATA[')) {
          in_cdata = true
        } else if (in_cdata && line.trim().includes(']]>')) {
          in_cdata = false
        } else {
          const trimmed_current_content = current_content.trim()
          if (
            trimmed_current_content.startsWith('```') &&
            trimmed_current_content.endsWith('```') &&
            line.trim() !== ''
          ) {
            const final_content = strip_markdown_code_block(
              trimmed_current_content
            )

            state = 'TEXT'

            create_or_update_file_item({
              file_name: current_file_name,
              content: final_content,
              workspace_name: current_workspace_name,
              file_ref_map,
              results
            })

            current_file_name = ''
            current_content = ''
            current_workspace_name = undefined
            top_level_xml_file_mode = false
            in_cdata = false
            current_xml_tag = null
            i-- // Reprocess current line in TEXT mode
          } else {
            current_content += (current_content ? '\n' : '') + line
          }
        }
        continue
      }

      const trimmed_line = line.trim()

      if (trimmed_line.startsWith('```') && trimmed_line !== '```') {
        if (
          backtick_nesting_level === 1 &&
          current_file_name &&
          current_content.trim() === '' &&
          !current_file_name_was_comment &&
          !xml_file_mode
        ) {
          state = 'TEXT'
          last_seen_file_path_comment = current_file_name
          current_file_name = ''
          current_content = ''
          is_first_content_line = false
          current_workspace_name = undefined
          xml_file_mode = false
          in_cdata = false
          i--
          continue
        }

        if (
          backtick_nesting_level == 1 &&
          (current_language == 'markdown' || current_language == 'md')
        ) {
          is_first_content_line = true
        }
        backtick_nesting_level++
        if (
          (current_language == 'markdown' || current_language === 'md') &&
          backtick_nesting_level > 1
        ) {
          is_markdown_container_block = true
        }
      } else if (
        trimmed_line === '```' &&
        backtick_nesting_level === 1 &&
        current_content.trim() === '' &&
        i > 0 &&
        lines[i - 1].trim() !== '' &&
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
        trimmed_line === '```' &&
        backtick_nesting_level === 1 &&
        (current_language === 'markdown' || current_language === 'md') &&
        ((current_content.trim() === '' &&
          i > 0 &&
          lines[i - 1].trim() !== '') ||
          (i > 0 &&
            (lines[i - 1].trim() === '' ||
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
          trimmed_line === '```' &&
          backtick_nesting_level === 1 &&
          current_file_name &&
          i + 1 < lines.length &&
          lines[i + 1].trim() !== '' &&
          !lines[i + 1].trim().startsWith('```')
        ) {
          should_close = false
        }

        if (should_close) {
          backtick_nesting_level--
          if (
            backtick_nesting_level == 1 &&
            (current_language == 'markdown' || current_language == 'md')
          ) {
            is_first_content_line = true
          }
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

        create_or_update_file_item({
          file_name: current_file_name,
          content: cleaned_content,
          workspace_name: current_workspace_name,
          file_ref_map,
          results
        })

        if (!current_file_name) {
          const raw_code_block = [
            `\`\`\`${current_language}`,
            current_content,
            '```'
          ].join('\n')

          results.push({ type: 'text', content: raw_code_block })
        }

        if (current_file_name && !current_content.trim()) {
          last_seen_file_path_comment = current_file_name
          last_seen_file_path_was_header = false
        }

        current_file_name = ''
        current_content = ''
        is_first_content_line = false
        current_workspace_name = undefined
        xml_file_mode = false
        in_cdata = false
        if (last_backticks_index != -1) {
          current_text_block = line.substring(last_backticks_index + 3)
        }
      } else {
        if (is_first_content_line && line.trim().startsWith('<')) {
          const xml_info = extract_file_path_from_xml(line)
          if (xml_info) {
            const { workspace_name, relative_path } =
              extract_and_set_workspace_path({
                raw_file_path: xml_info.path,
                is_single_root_folder_workspace:
                  params.is_single_root_folder_workspace
              })
            current_file_name = relative_path
            if (workspace_name) {
              current_workspace_name = workspace_name
            }
            xml_file_mode = true
            current_xml_tag = xml_info.tagName
            is_first_content_line = false
            current_file_name_was_comment = true
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
              extract_and_set_workspace_path({
                raw_file_path: extracted_filename,
                is_single_root_folder_workspace:
                  params.is_single_root_folder_workspace
              })
            current_file_name = relative_path
            if (workspace_name) {
              current_workspace_name = workspace_name
            }

            is_first_content_line = false
            current_file_name_was_comment = true
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
                create_or_update_file_item({
                  file_name: current_file_name,
                  content: cleaned_content,
                  workspace_name: current_workspace_name,
                  file_ref_map,
                  results
                })
              }
              current_content = ''
            }

            const { workspace_name, relative_path } =
              extract_and_set_workspace_path({
                raw_file_path: extracted_filename,
                is_single_root_folder_workspace:
                  params.is_single_root_folder_workspace
              })
            current_file_name = relative_path
            current_file_name_was_comment = is_comment
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

        if (
          xml_file_mode &&
          !in_cdata &&
          line.trim() == `</${current_xml_tag}>`
        ) {
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
      cleaned_content = strip_markdown_code_block(current_content)
    }

    create_or_update_file_item({
      file_name: current_file_name,
      content: cleaned_content,
      workspace_name: current_workspace_name,
      file_ref_map,
      results
    })
  } else if (state == 'TEXT' && current_text_block.trim()) {
    flush_text_block({
      text_block: current_text_block,
      results
    })
  }

  const merged_results: (FileItem | TextItem)[] = []
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
