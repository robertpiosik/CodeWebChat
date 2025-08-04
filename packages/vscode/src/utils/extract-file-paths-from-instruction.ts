import { captureParts, SYMBOLS } from '@shared/constants/symbols'

export const extract_file_paths_from_instruction = (
  instruction: string
): string[] => {
  const backticks = /`[^`]+`/
  const regex = captureParts(SYMBOLS.File.regexp, backticks)

  const matches = instruction.match(regex)
  if (!matches) return []

  return matches.map((part) => {
    if (SYMBOLS.File.exactMatch(part)) {
      return SYMBOLS.File.getValue(part)
    }

    return part.slice(1, -1)
  })
}
