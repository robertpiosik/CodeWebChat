export const shrink_jsx = (content: string): string => {
  const lines = content.split(/\r?\n/)
  const result: string[] = []
  let is_in_block_comment = false
  const block_stack: { is_skipped: boolean; is_type_decl?: boolean }[] = []
  let last_code_buffer = ''
  let is_in_string: false | '"' | "'" | '`' = false
  let jsx_tag_state: 'none' | 'name' | 'attributes' = 'none'
  let jsx_attribute_brace_depth = 0
  let global_paren_depth = 0
  let use_effect_start_depth = -1

  for (const line of lines) {
    let processed_line = ''
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const next_char = line[i + 1]

      const current_skipped =
        block_stack.length > 0
          ? block_stack[block_stack.length - 1].is_skipped
          : false

      if (is_in_block_comment) {
        if (char == '*' && next_char == '/') {
          is_in_block_comment = false
          i += 2
        } else {
          i++
        }
        continue
      }

      if (is_in_string) {
        if (char == '\\') {
          if (
            jsx_tag_state !== 'attributes' &&
            !current_skipped &&
            use_effect_start_depth === -1
          ) {
            processed_line += char + (next_char || '')
          }
          last_code_buffer += char + (next_char || '')
          i += 2
          continue
        }
        if (char === is_in_string) {
          is_in_string = false
        }
        if (
          jsx_tag_state !== 'attributes' &&
          !current_skipped &&
          use_effect_start_depth === -1
        ) {
          processed_line += char
        }
        last_code_buffer += char
        i++
        continue
      }

      if (char == '"' || char === "'" || char == '`') {
        is_in_string = char
        if (
          jsx_tag_state !== 'attributes' &&
          !current_skipped &&
          use_effect_start_depth === -1
        ) {
          processed_line += char
        }
        last_code_buffer += char
        i++
        continue
      }

      if (char == '/' && next_char == '/') {
        break
      }

      if (char == '/' && next_char == '*') {
        is_in_block_comment = true
        i += 2
        continue
      }

      if (jsx_tag_state === 'attributes') {
        if (char === '{') {
          jsx_attribute_brace_depth++
        } else if (char === '}') {
          if (jsx_attribute_brace_depth > 0) {
            jsx_attribute_brace_depth--
          }
        } else if (
          char === '/' &&
          next_char === '>' &&
          jsx_attribute_brace_depth === 0
        ) {
          jsx_tag_state = 'none'
          if (!current_skipped && use_effect_start_depth === -1) {
            processed_line += '/>'
          }
          last_code_buffer += '/>'
          i += 2
          continue
        } else if (char === '>' && jsx_attribute_brace_depth === 0) {
          jsx_tag_state = 'none'
          if (!current_skipped && use_effect_start_depth === -1) {
            processed_line += '>'
          }
          last_code_buffer += '>'
          i++
          continue
        }
        last_code_buffer += char
        i++
        continue
      }

      if (char === '<' && next_char && /[a-zA-Z]/.test(next_char)) {
        const trimmed_buffer = last_code_buffer.trimEnd()
        const last_non_space = trimmed_buffer.slice(-1)
        const is_jsx_context =
          ['(', '=', ':', '>', '?', '&', '|', ',', '{', '['].includes(
            last_non_space
          ) || /(^|\W)(return|yield|await|default)$/.test(trimmed_buffer)

        if (is_jsx_context) {
          jsx_tag_state = 'name'
        }
      } else if (jsx_tag_state === 'name') {
        if (/\s/.test(char)) {
          jsx_tag_state = 'attributes'
          jsx_attribute_brace_depth = 0
          last_code_buffer += char
          i++
          continue
        } else if (char === '>') {
          jsx_tag_state = 'none'
        } else if (char === '/' && next_char === '>') {
          jsx_tag_state = 'none'
        }
      }

      if (char === '(') {
        global_paren_depth++
        if (
          use_effect_start_depth === -1 &&
          /(^|\W)(React\.)?useEffect\s*$/.test(last_code_buffer)
        ) {
          use_effect_start_depth = global_paren_depth
          processed_line = processed_line.replace(/(React\.)?useEffect\s*$/, '')
          last_code_buffer += char
          i++
          continue
        }
      } else if (char === ')') {
        if (use_effect_start_depth === global_paren_depth) {
          use_effect_start_depth = -1
          global_paren_depth--
          last_code_buffer += char
          i++
          continue
        }
        global_paren_depth--
      }

      if (char == '{') {
        const is_keeper =
          /(^|\s)(class|interface|enum|namespace|type)(\s|$)/.test(
            last_code_buffer
          ) || /(^|\s)(import|export|default)\s*$/.test(last_code_buffer)
        const is_object_literal = /(=|:|\()\s*$/.test(
          last_code_buffer.trimEnd()
        )

        const last_statement = last_code_buffer.split(/[{;}]/).pop() || ''
        const is_type_decl = /(^|\s)(interface|type)\b/.test(last_statement)

        let parent_skipped = current_skipped
        if (use_effect_start_depth !== -1) {
          parent_skipped = true
        }
        const should_skip = parent_skipped || (!is_keeper && !is_object_literal)

        block_stack.push({ is_skipped: should_skip, is_type_decl })

        if (!parent_skipped) {
          processed_line += '{'
        }

        last_code_buffer += '{'
        i++
        continue
      } else if (char == '}') {
        let parent_skipped =
          block_stack.length > 1
            ? block_stack[block_stack.length - 2].is_skipped
            : false
        if (use_effect_start_depth !== -1) {
          parent_skipped = true
        }

        if (!parent_skipped) {
          processed_line += '}'
        }

        if (block_stack.length > 0) {
          block_stack.pop()
        }
        last_code_buffer += '}'
        i++
        continue
      }

      let active_skipped =
        block_stack.length > 0
          ? block_stack[block_stack.length - 1].is_skipped
          : false
      let parent_skipped =
        block_stack.length > 1
          ? block_stack[block_stack.length - 2].is_skipped
          : false

      if (use_effect_start_depth !== -1) {
        active_skipped = true
        parent_skipped = true
      }

      if (active_skipped && !parent_skipped && use_effect_start_depth === -1) {
        if (/(^|\W)return$/.test(last_code_buffer) && /\W/.test(char)) {
          block_stack[block_stack.length - 1].is_skipped = false
          const prefix =
            processed_line.length == 0 ? line.match(/^\s*/)?.[0] || '' : ''
          processed_line += prefix + 'return'
        }
      }

      if (
        (block_stack.length == 0 ||
          !block_stack[block_stack.length - 1].is_skipped) &&
        use_effect_start_depth === -1
      ) {
        processed_line += char
      }
      last_code_buffer += char
      i++
    }

    const trimmed = processed_line.trim()
    if (trimmed) {
      let final_line = processed_line.trimEnd().replace(/;+$/, '')

      const ends_with_open_or_comma = /[[({,]$/.test(final_line)
      if (
        !ends_with_open_or_comma &&
        !final_line.includes('=>') &&
        /^\s*(?:export\s+)?(?:const|let|var)\s+/.test(final_line)
      ) {
        const match = final_line.match(
          /^(\s*(?:export\s+)?(?:const|let|var)\s+(?:\[[^\]]+\]|\{[^}]+\}|[^\s=:]+)(?:\s*:[^=]+)?)\s*=(?!>).+$/
        )
        if (match) {
          final_line = match[1].trimEnd()
        }
      }

      const in_type_decl = block_stack.some((b) => b.is_type_decl)
      if (in_type_decl && !ends_with_open_or_comma) {
        final_line = final_line.replace(
          /^(\s*['"]?[a-zA-Z0-9_?-]+['"]?)\s*:.*$/,
          '$1'
        )
      }

      result.push(final_line)
    }

    last_code_buffer += ' '
    if (last_code_buffer.length > 200) {
      last_code_buffer = last_code_buffer.slice(-200)
    }
  }

  return result.length > 0 ? result.join('\n') + '\n' : ''
}
