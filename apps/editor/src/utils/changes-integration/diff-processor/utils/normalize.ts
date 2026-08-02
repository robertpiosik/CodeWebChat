import { NormalizedLine } from '../types'

export const normalize_original_code = (params: {
  original_code_lines: string[]
  use_strict_whitespace?: boolean
}): NormalizedLine[] => {
  const original_code_lines_normalized: NormalizedLine[] = []

  let line_count = 0
  for (let i = 0; i < params.original_code_lines.length; i++) {
    let line = params.original_code_lines[i]

    if (line.trim() == '') {
      line = '~nnn'
    }

    const line_normalized = line
      .replace(/\r\n/g, '')
      .replace(/\r/g, '')
      .replace(/\n/g, '')

    let line_normalized_processed = line_normalized.replace(/\s+/g, '')

    if (params.use_strict_whitespace) {
      line_normalized_processed = line_normalized
    }

    original_code_lines_normalized.push({
      key: line_count,
      value: line_normalized_processed
    })

    line_count++
  }

  return original_code_lines_normalized
}

export const normalize_patch_lines = (params: {
  patch_lines: string[]
  use_strict_whitespace?: boolean
}): { patch_lines_original: string[]; patch_lines_normalized: string[] } => {
  const patch_lines_original: string[] = []
  const patch_lines_normalized: string[] = []

  for (let i = 0; i < params.patch_lines.length; i++) {
    let line = params.patch_lines[i]

    if (
      line.startsWith('diff --git') ||
      line.startsWith('index') ||
      line.startsWith('---') ||
      line.startsWith('+++')
    ) {
      continue
    }

    if (line.trim() == '') {
      line = '~nnn'
    } else if (line.trim() == '+') {
      line = '+~nnn'
    } else if (line.trim() == '-') {
      line = '-~nnn'
    }

    patch_lines_original.push(
      line.startsWith(' ') ? line.substring(1, line.length) : line
    )

    let line_normalized = line
      .replace(/\r\n/g, '')
      .replace(/\r/g, '')
      .replace(/\n/g, '')

    let line_normalized_processed = ''

    if (params.use_strict_whitespace) {
      if (line_normalized.startsWith(' ')) {
        line_normalized_processed = '~' + line_normalized.substring(1)
      } else {
        line_normalized_processed = line_normalized
      }
    } else {
      if (line_normalized.startsWith(' ')) {
        line_normalized = line_normalized.replace(/^\s+/, '~')
      }
      line_normalized_processed = line_normalized.replace(/\s+/g, '')
    }

    patch_lines_normalized.push(line_normalized_processed)
  }

  return { patch_lines_original, patch_lines_normalized }
}
