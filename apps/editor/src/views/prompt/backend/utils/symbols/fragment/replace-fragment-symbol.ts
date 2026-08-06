export const replace_fragment_symbol = (instruction: string): string => {
  const regex =
    /<fragment path="([^"]+)"(?: start="([^"]+)")?(?: end="([^"]+)")?>([\s\S]*?)<\/fragment>/g

  return instruction.replace(regex, (_match, path, start, end, content) => {
    let clean_content = content

    if (
      clean_content.startsWith('\n```\n') &&
      clean_content.endsWith('\n```\n')
    ) {
      clean_content = clean_content.slice(5, -5)
    } else if (
      clean_content.startsWith('```\n') &&
      clean_content.endsWith('\n```')
    ) {
      clean_content = clean_content.slice(4, -4)
    } else if (
      clean_content.startsWith('```') &&
      clean_content.endsWith('```')
    ) {
      clean_content = clean_content.slice(3, -3)
    } else if (clean_content.startsWith('\n') && clean_content.endsWith('\n')) {
      clean_content = clean_content.slice(1, -1)
    }

    const range_str = start && end ? ` (${start}-${end})` : ''

    return `\n\n\`${path}\`${range_str}\n\n\`\`\`\n${clean_content}\n\`\`\`\n\n`
  })
}
