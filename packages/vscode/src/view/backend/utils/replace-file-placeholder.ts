export const replace_file_placeholder = (instruction: string): string => {
  if (!instruction.includes('@File:')) {
    return instruction
  }

  const regex = /(@File:[^\s]+)/g
  const parts = instruction.split(regex)
  return parts.map((part) => {
    if (part && /^@File:[^\s]+$/.test(part)) {
      return `\`${part.slice(6)}\``
    }
    return part
  }).join('')
}
