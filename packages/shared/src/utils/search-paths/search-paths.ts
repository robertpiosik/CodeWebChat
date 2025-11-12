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

const get_match_score = (params: {
  query: string
  parts: string[]
  part_idx: number
  memo: Record<string, number>
}): number => {
  const key = `${params.part_idx}:${params.query}`
  if (params.memo[key] !== undefined) {
    return params.memo[key]
  }

  if (params.query.length == 0) {
    return 0
  }

  if (params.part_idx >= params.parts.length) {
    return -1
  }

  // Option 1: Skip current part.
  const score_skipping = get_match_score({
    query: params.query,
    parts: params.parts,
    part_idx: params.part_idx + 1,
    memo: params.memo
  })

  // Option 2: Match a prefix of the query with a prefix of the current part.
  const part = params.parts[params.part_idx]
  let best_score_matching = -1

  for (let i = 1; i <= params.query.length; i++) {
    const query_prefix = params.query.substring(0, i)
    if (part.startsWith(query_prefix)) {
      const score = get_match_score({
        query: params.query.substring(i),
        parts: params.parts,
        part_idx: params.part_idx + 1,
        memo: params.memo
      })
      if (score !== -1) {
        if (best_score_matching === -1 || score < best_score_matching) {
          best_score_matching = score
        }
      }
    } else {
      break
    }
  }

  let result = -1
  if (score_skipping !== -1) {
    result = score_skipping + 1 // +1 for skipping current part
  }

  if (best_score_matching !== -1) {
    if (result === -1 || best_score_matching < result) {
      result = best_score_matching
    }
  }

  return (params.memo[key] = result)
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

  const search_lower = params.search_value.toLowerCase()

  const scored_paths = params.paths.map((path_item) => {
    const path_to_search_lower = path_item.toLowerCase()

    if (path_to_search_lower.includes(search_lower)) {
      return { path: path_item, score: 0 }
    }

    if (/[^a-z0-9]/.test(search_lower)) {
      return { path: path_item, score: -1 }
    }

    const parts = get_path_parts(path_item)
    const score = get_match_score({
      query: search_lower,
      parts,
      part_idx: 0,
      memo: {}
    })
    return { path: path_item, score }
  })

  const matched_paths = scored_paths.filter((item) => item.score !== -1)

  if (matched_paths.length === 0) return []

  const min_score = Math.min(...matched_paths.map((item) => item.score))

  return matched_paths
    .filter((item) => item.score === min_score)
    .map((item) => item.path)
}
