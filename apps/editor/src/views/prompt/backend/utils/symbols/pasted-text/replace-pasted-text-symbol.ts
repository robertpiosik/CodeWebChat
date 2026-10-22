import * as vscode from 'vscode'
import { PersistentTextStorage } from '../../persistent-text-storage'

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

        result_string += instruction.slice(last_index, match.index)

        if (replacement.success && replacement.content) {
          const backticks = replacement.content.includes('```') ? '````' : '```'
          result_string += `\n${backticks}\n${replacement.content}\n${backticks}\n`
        } else {
          result_string += match[0]
        }

        last_index = match.index + match[0].length
      }

      result_string += instruction.slice(last_index).trim()

      return result_string
    })
  )
}
