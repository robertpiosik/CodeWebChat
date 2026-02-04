import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { fetch_and_save_website } from './website-fetcher'

export const replace_website_symbol = async (params: {
  instruction: string
}): Promise<string> => {
  const regex = /#Website\(([^)]+)\)/g
  const matches = Array.from(params.instruction.matchAll(regex))

  if (matches.length == 0) {
    return params.instruction
  }

  const replacements = await Promise.all(
    matches.map(async (match) => {
      const url = match[1]
      const hash = crypto.createHash('md5').update(url).digest('hex')
      const filename = `cwc-website-${hash}.txt`
      const file_path = path.join(os.tmpdir(), filename)

      try {
        const content = await fs.promises.readFile(file_path, 'utf-8')
        return {
          content,
          success: true
        }
      } catch (error) {
        // If file is missing (e.g. reboot), try to refetch
        const content = await fetch_and_save_website(url)
        if (content) {
          return {
            content,
            success: true
          }
        }
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

    if (replacement.success && replacement.content) {
      result_string += `\n<document>\n<![CDATA[\n${replacement.content}\n]]>\n</document>\n`
    } else {
      result_string += match[0]
    }

    last_index = match.index + match[0].length
  }

  result_string += params.instruction.slice(last_index).trim()

  return result_string
}
