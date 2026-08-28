import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { fetch_and_save_website } from '../../website-fetcher'
import { SymbolCacheManager } from '../symbol-cache'

export const replace_website_symbol = async (params: {
  instruction: string
  symbols_cache?: SymbolCacheManager
}): Promise<string> => {
  const regex = /#Website\(([^)]+)\)/g
  const matches = Array.from(params.instruction.matchAll(regex))

  if (matches.length == 0) {
    return params.instruction
  }

  const replacements = await Promise.all(
    matches.map(async (match) => {
      const full_match = match[0]
      if (params.symbols_cache) {
        const cached = params.symbols_cache.get(full_match)
        if (cached) {
          return {
            content: '',
            success: true,
            cached: true,
            replacement: cached.replacement
          }
        }
      }

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
    const full_match = match[0]

    result_string += params.instruction.slice(last_index, match.index).trim()

    if (replacement.cached && replacement.replacement !== undefined) {
      result_string += replacement.replacement
    } else if (replacement.success && replacement.content) {
      const rep = `\n\n---\n\n${replacement.content}\n\n---\n\n`
      result_string += rep
      if (params.symbols_cache) {
        params.symbols_cache.set(full_match, rep, '')
      }
    } else {
      result_string += full_match
      if (params.symbols_cache) {
        params.symbols_cache.set(full_match, full_match, '')
      }
    }

    last_index = match.index + full_match.length
  }

  result_string += params.instruction.slice(last_index).trim()

  return result_string
}
