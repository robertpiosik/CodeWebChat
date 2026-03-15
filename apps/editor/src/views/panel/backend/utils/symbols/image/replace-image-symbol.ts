import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

export const replace_image_symbol = async (params: {
  instruction: string
  remove?: boolean
}): Promise<string> => {
  const regex = /#Image\(([a-fA-F0-9]+)\)/g

  if (params.remove) {
    return params.instruction.replace(regex, '')
  }

  const matches = Array.from(params.instruction.matchAll(regex))

  if (matches.length == 0) {
    return params.instruction
  }

  const replacements = await Promise.all(
    matches.map(async (match) => {
      const hash = match[1]
      const filename = `cwc-image-${hash}.txt`
      const file_path = path.join(os.tmpdir(), filename)
      try {
        const content_base64 = await fs.promises.readFile(file_path, 'utf-8')
        return {
          content_base64,
          success: true
        }
      } catch (error) {
        return {
          success: false
        }
      }
    })
  )

  let result_string = ''
  let last_index = 0

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const replacement = replacements[i]

    result_string += params.instruction.slice(last_index, match.index)

    if (replacement.success && replacement.content_base64) {
      result_string += `<cwc-image>${replacement.content_base64}</cwc-image>`
    } else {
      result_string += match[0]
    }

    last_index = match.index + match[0].length
  }

  result_string += params.instruction.slice(last_index)

  return result_string
}
