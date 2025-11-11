const get_path_parts = (path: string): string[] => {
  return path
    .split(/[/\\]/)
    .flatMap((part) => {
      const with_spaces = part
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[._-]/g, ' ')
      return with_spaces.split(/\s+/)
    })
    .map((p) => p.toLowerCase())
    .filter((p) => p.length > 0)
}

const is_prefix_match_recursive = (params: {
  query: string
  parts: string[]
  part_idx: number
  memo: Record<string, boolean>
}): boolean => {
  const key = `${params.part_idx}:${params.query}`
  if (params.memo[key] !== undefined) {
    return params.memo[key]
  }

  if (params.query.length === 0) {
    return true
  }

  if (params.part_idx >= params.parts.length) {
    return false
  }

  // Option 1: Skip current part and try to match the query with the rest of the parts.
  if (
    is_prefix_match_recursive({
      query: params.query,
      parts: params.parts,
      part_idx: params.part_idx + 1,
      memo: params.memo
    })
  ) {
    return (params.memo[key] = true)
  }

  // Option 2: Match a prefix of the query with a prefix of the current part.
  const part = params.parts[params.part_idx]
  for (let i = 1; i <= params.query.length; i++) {
    const query_prefix = params.query.substring(0, i)
    if (part.startsWith(query_prefix)) {
      if (
        is_prefix_match_recursive({
          query: params.query.substring(i),
          parts: params.parts,
          part_idx: params.part_idx + 1,
          memo: params.memo
        })
      ) {
        return (params.memo[key] = true)
      }
    } else {
      break
    }
  }

  return (params.memo[key] = false)
}

export const search_paths = (params: {
  paths: string[]
  search_value: string
}): string[] => {
  if (!params.search_value) {
    return params.paths
  }
  if (/[/\\\.]$/.test(params.search_value)) {
    return []
  }
  return params.paths.filter((path_item) => {
    const search_lower = params.search_value.toLowerCase()
    const path_to_search_lower = path_item.toLowerCase()

    if (path_to_search_lower.includes(search_lower)) {
      return true
    }

    if (/[^a-z0-9]/.test(search_lower)) {
      return false
    }

    const parts = get_path_parts(path_item)
    return is_prefix_match_recursive({
      query: search_lower,
      parts,
      part_idx: 0,
      memo: {}
    })
  })
}
