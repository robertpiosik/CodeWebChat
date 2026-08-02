export const handle_empty_file = (diff_patch: string): string | null => {
  const patch_normalized = diff_patch.replace(/\r\n/g, '\n')
  const patch_lines = patch_normalized.split('\n')
  let has_additions = false
  let in_hunk = false
  const result_lines: string[] = []
  let seen_content = false

  for (const line of patch_lines) {
    if (line.startsWith('@@')) {
      in_hunk = true
      continue
    }
    if (!in_hunk) continue

    let line_to_add: string | null = null
    let is_addition = false

    if (line.startsWith('+')) {
      line_to_add = line.substring(1)
      is_addition = true
      has_additions = true
    } else if (line.startsWith(' ')) {
      line_to_add = line.substring(1)
    } else if (line == '') {
      line_to_add = ''
    }

    if (line_to_add !== null) {
      if (!seen_content) {
        if (!is_addition && line_to_add.trim() == '') {
          continue
        }
        seen_content = true
      }
      result_lines.push(line_to_add)
    }
  }

  if (has_additions) {
    let final_string = result_lines.join('\n')
    if (final_string.length > 0 && !final_string.endsWith('\n')) {
      final_string += '\n'
    }
    return final_string
  }

  return null
}
