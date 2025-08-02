export const extract_file_paths_from_instruction = (
  instruction: string
): string[] => {
  const matches = instruction.match(/`([^`]+)`/g)
  if (!matches) return []

  return matches.map((match) => match.slice(1, -1)) // Remove backticks
}
