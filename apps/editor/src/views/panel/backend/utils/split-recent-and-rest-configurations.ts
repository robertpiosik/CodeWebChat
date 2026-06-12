export const split_recent_and_rest_configurations = <T>(
  configurations: T[],
  recent_ids: string[],
  get_id: (configuration: T) => string | undefined
): { recent: T[]; rest: T[] } => {
  const matched_recent: T[] = []
  const remaining: T[] = []

  configurations.forEach((configuration) => {
    const id = get_id(configuration)
    if (id && recent_ids.includes(id)) {
      matched_recent.push(configuration)
    } else {
      remaining.push(configuration)
    }
  })

  matched_recent.sort((a, b) => {
    const id_a = get_id(a)!
    const id_b = get_id(b)!
    return recent_ids.indexOf(id_a) - recent_ids.indexOf(id_b)
  })

  return { recent: matched_recent, rest: remaining }
}