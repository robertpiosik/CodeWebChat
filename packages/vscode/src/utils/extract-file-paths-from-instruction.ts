export const extract_file_paths_from_instruction = (
  instruction: string
): string[] => {
  const regex = /(@File:[^\s]+|`[^`]+`)/g

  const matches = instruction.match(regex)
  if (!matches) return []

  return matches.map((part) => {
    if (part && /^@File:[^\s]+$/.test(part)) {
      return part.slice(6)
    }

    return part.slice(1, -1)
  })
}
