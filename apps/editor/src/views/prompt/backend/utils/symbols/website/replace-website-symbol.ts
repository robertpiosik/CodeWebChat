import * as vscode from 'vscode'
import { SymbolCacheManager } from '../symbol-cache'
import { PersistentTextStorage } from '../../persistent-text-storage'
import { get_markdown_backticks } from '@/utils/get-markdown-backticks'

export const replace_website_symbol = async (params: {
  instructions: string[]
  extension_context: vscode.ExtensionContext
  symbols_cache?: SymbolCacheManager
}): Promise<string[]> => {
  const storage = new PersistentTextStorage(params.extension_context)

  return Promise.all(
    params.instructions.map(async (instruction) => {
      const regex =
        /#Website\([^ ]+ ([a-fA-F0-9]+)(?::\d+)?(?: "((?:\\.|[^"\\])*)")?\)/g
      const matches = Array.from(instruction.matchAll(regex))

      if (matches.length === 0) {
        return instruction
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

          const id = match[1]

          try {
            const content = await storage.load(id)
            return {
              content,
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
        const full_match = match[0]

        result_string += instruction.slice(last_index, match.index).trim()

        if (replacement.cached && replacement.replacement !== undefined) {
          result_string += replacement.replacement
        } else if (replacement.success && replacement.content) {
          let title_str = ''
          if (match[2]) {
            const title = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
            title_str = `**${title}**\n\n`
          }
          const backticks = get_markdown_backticks(replacement.content)
          const rep = `\n\n${title_str}${backticks}markdown\n${replacement.content}\n${backticks}\n\n`
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

      result_string += instruction.slice(last_index).trim()

      return result_string
    })
  )
}
