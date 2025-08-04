import { captureParts, SYMBOLS } from '@shared/constants/symbols'

export const replace_file_placeholder = (instruction: string): string => {
  if (!instruction.includes(SYMBOLS.File.mark)) {
    return instruction
  }

  const regex = captureParts(SYMBOLS.File.regexp)
  const parts = instruction.split(regex)
  return parts
    .map((part) => {
      if (SYMBOLS.File.exactMatch(part)) {
        return `\`${SYMBOLS.File.getValue(part)}\``
      }
      return part
    })
    .join('')
}
