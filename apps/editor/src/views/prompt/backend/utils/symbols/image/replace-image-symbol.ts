import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

export const replace_image_symbol = async (params: {
  instruction: string
  remove?: boolean
  as_paths?: boolean
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
      const txt_filename = `cwc-image-${hash}.txt`
      const txt_path = path.join(os.tmpdir(), txt_filename)
      const png_filename = `cwc-image-${hash}.png`
      const png_path = path.join(os.tmpdir(), png_filename)

      try {
        if (params.as_paths) {
          if (!fs.existsSync(png_path)) {
            const content_base64 = await fs.promises.readFile(txt_path, 'utf-8')
            const buffer = Buffer.from(content_base64, 'base64')
            await fs.promises.writeFile(png_path, buffer)
          }
          return {
            path: png_path,
            success: true
          }
        } else {
          const content_base64 = await fs.promises.readFile(txt_path, 'utf-8')
          return {
            content_base64,
            success: true
          }
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

    if (replacement.success) {
      if (params.as_paths && replacement.path) {
        result_string += replacement.path
      } else if (replacement.content_base64) {
        result_string += `<cwc-image>${replacement.content_base64}</cwc-image>`
      } else {
        result_string += match[0]
      }
    } else {
      result_string += match[0]
    }

    last_index = match.index + match[0].length
  }

  result_string += params.instruction.slice(last_index)

  return result_string
}
