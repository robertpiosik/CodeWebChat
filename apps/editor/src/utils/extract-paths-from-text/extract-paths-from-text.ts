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

  let tree_stack: { level: number; name: string }[] = []

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

    // ASCII tree extraction
    const idx1 = line.indexOf('├── ')
    const idx2 = line.indexOf('└── ')
    const idx =
      idx1 !== -1 && idx2 !== -1 ? Math.min(idx1, idx2) : Math.max(idx1, idx2)

    if (idx !== -1) {
      const prefix = line.substring(0, idx)
      if (/^[│\s]*$/.test(prefix)) {
        let name = line.substring(idx + 4).trim()
        if (name.startsWith('`') && name.endsWith('`')) {
          name = name.substring(1, name.length - 1).trim()
        }
        const level = prefix.length

        while (
          tree_stack.length > 0 &&
          tree_stack[tree_stack.length - 1].level >= level
        ) {
          tree_stack.pop()
        }

        tree_stack.push({ level, name })

        const full_path = tree_stack.map((n) => n.name).join('/')
        found_paths.add(full_path.replace(/[.?!]+$/, ''))
      } else {
        tree_stack = []
      }
    } else {
      tree_stack = []
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
