import { extract_paths_from_ascii_tree } from '../ascii-tree'

export const extract_paths_from_text = (params: {
  text: string
  workspace_files: string[]
}): string[] => {
  const found_paths = new Set<string>()
  const workspace_files_set = new Set(params.workspace_files)

  const inline_matches = params.text.match(/`([^`]+)`/g)
  if (inline_matches) {
    inline_matches.forEach((match) => {
      found_paths.add(match.replace(/`/g, '').trim())
    })
  }

  const ascii_paths = extract_paths_from_ascii_tree(params.text)
  ascii_paths.forEach((p) => found_paths.add(p))

  const lines = params.text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      let path_str = trimmed.substring(1).trim()
      if (path_str.startsWith('`') && path_str.endsWith('`')) {
        path_str = path_str.substring(1, path_str.length - 1).trim()
      }
      if (path_str) {
        found_paths.add(path_str.replace(/[.?!]+$/, ''))
      }
    }
  }

  const words = params.text.replace(/`/g, ' ').split(/[\s,;:'"<>()[\]{}]+/)
  for (const word of words) {
    if (word) {
      const cleaned = word.trim().replace(/[.?!]+$/, '')
      found_paths.add(cleaned)
    }
  }

  const matched_files_with_index = new Map<string, number>()

  for (const original_p of found_paths) {
    let p = original_p
    if (p.startsWith('./')) {
      p = p.substring(2)
    } else if (p.startsWith('/')) {
      p = p.substring(1)
    }

    if (!p) continue

    let idx = params.text.indexOf(original_p)
    if (idx == -1) {
      idx = params.text.indexOf(p)
    }
    const safe_idx = idx != -1 ? idx : Infinity

    if (workspace_files_set.has(p)) {
      const current_idx = matched_files_with_index.get(p) ?? Infinity
      matched_files_with_index.set(p, Math.min(current_idx, safe_idx))
    }
  }

  return Array.from(matched_files_with_index.keys()).sort((a, b) => {
    const idx_a = matched_files_with_index.get(a) ?? Infinity
    const idx_b = matched_files_with_index.get(b) ?? Infinity
    if (idx_a == idx_b) {
      return a.localeCompare(b)
    }
    return idx_a - idx_b
  })
}
