export const extract_paths_from_bullet_list = (params: {
  text: string
  workspace_files: string[]
}): string[] => {
  const found_paths = new Set<string>()
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

  const matched_files_with_index = new Map<string, number>()

  for (const original_p of found_paths) {
    let p = original_p
    if (p.startsWith('./')) {
      p = p.substring(2)
    } else if (p.startsWith('/')) {
      p = p.substring(1)
    }
    while (p.startsWith('/')) {
      p = p.substring(1)
    }

    if (!p || p === '.' || p === '..') continue

    let idx = params.text.indexOf(original_p)
    if (idx == -1) {
      idx = params.text.indexOf(p)
    }
    const safe_idx = idx != -1 ? idx : Infinity

    for (const file of params.workspace_files) {
      if (file === p || file.endsWith('/' + p)) {
        const current_idx = matched_files_with_index.get(file) ?? Infinity
        matched_files_with_index.set(file, Math.min(current_idx, safe_idx))
      }
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
