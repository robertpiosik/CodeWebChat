import * as vscode from 'vscode'
import { PersistentTextStorage } from '../../persistent-text-storage'
import { get_markdown_backticks } from '@/utils/get-markdown-backticks'

export const replace_pasted_text_symbol = async (params: {
  instructions: string[]
  extension_context: vscode.ExtensionContext
}): Promise<string[]> => {
  const storage = new PersistentTextStorage(params.extension_context)

  return Promise.all(
    params.instructions.map(async (instruction) => {
      const regex = /#PastedText\(([a-fA-F0-9]+)(?::\d+)?\)/g

      const matches = Array.from(instruction.matchAll(regex))

      if (matches.length === 0) {
        return instruction
      }

      const replacements = await Promise.all(
        matches.map(async (match) => {
          const id = match[1]
          try {
            const content = await storage.load(id)
            return {
              content,
              success: true
            }
          } catch {
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

        const text_between = instruction.slice(last_index, match.index)
        const trimmed_text = text_between.trim()

        if (trimmed_text) {
          result_string += (result_string ? '\n\n' : '') + trimmed_text
        }

        if (replacement.success && replacement.content) {
          const backticks = get_markdown_backticks(replacement.content)
          const block = `${backticks}\n${replacement.content}\n${backticks}`
          result_string += (result_string ? '\n\n' : '') + block
        } else {
          result_string += (result_string ? '\n\n' : '') + match[0]
        }

        last_index = match.index + match[0].length
      }

      const tail = instruction.slice(last_index).trim()
      if (tail) {
        result_string += (result_string ? '\n\n' : '') + tail
      }

      return result_string
    })
  )
}
