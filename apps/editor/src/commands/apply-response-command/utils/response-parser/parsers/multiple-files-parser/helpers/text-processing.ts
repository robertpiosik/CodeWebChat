export const strip_markdown_code_block = (content: string): string => {
  const trimmed = content.trim()
  const lines = trimmed.split('\n')

  if (
    lines.length >= 2 &&
    lines[0].trim().startsWith('```') &&
    lines[lines.length - 1].trim() == '```'
  ) {
    return lines.slice(1, -1).join('\n')
  }

  return trimmed
}

export const process_conflict_markers = (content: string): string => {
  const lines = content.split('\n')
  const result_lines: string[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const startMatch = line.match(/^<<<<<<<\s*(.*)$/)

    if (startMatch) {
      const labelStart = startMatch[1]
      let j = i + 1
      let middleIndex = -1
      let endIndex = -1
      let labelEnd = ''

      while (j < lines.length) {
        if (lines[j].match(/^=======\s*$/)) {
          middleIndex = j
        } else if (lines[j].match(/^>>>>>>>\s*(.*)$/)) {
          endIndex = j
          labelEnd = lines[j].match(/^>>>>>>>\s*(.*)$/)![1]
          break
        }
        j++
      }

      if (middleIndex !== -1 && endIndex !== -1) {
        const leftContentLines = lines.slice(i + 1, middleIndex)
        const rightContentLines = lines.slice(middleIndex + 1, endIndex)

        const splitByDots = (blockLines: string[]) => {
          const parts: string[][] = []
          let currentPart: string[] = []
          for (const l of blockLines) {
            if (l.trim() == '...') {
              parts.push(currentPart)
              currentPart = []
            } else {
              currentPart.push(l)
            }
          }
          parts.push(currentPart)
          return parts
        }

        const leftParts = splitByDots(leftContentLines)
        const rightParts = splitByDots(rightContentLines)

        if (leftParts.length > 1 && leftParts.length === rightParts.length) {
          for (let k = 0; k < leftParts.length; k++) {
            result_lines.push(`<<<<<<< ${labelStart}`)
            result_lines.push(...leftParts[k])
            result_lines.push(`=======`)
            result_lines.push(...rightParts[k])
            result_lines.push(`>>>>>>> ${labelEnd}`)
          }
          i = endIndex + 1
          continue
        }
      }
    }

    result_lines.push(line)
    i++
  }

  return result_lines.join('\n')
}
