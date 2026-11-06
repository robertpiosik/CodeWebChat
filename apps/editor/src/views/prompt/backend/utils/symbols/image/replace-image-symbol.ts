import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { PersistentPromptStorage } from '../../persistent-prompt-storage'

export const replace_image_symbol = async (params: {
  instructions: string[]
  extension_context: vscode.ExtensionContext
  remove?: boolean
  as_paths?: boolean
  copy_images_to_dir?: string
}): Promise<string[]> => {
  const storage = new PersistentPromptStorage(params.extension_context, 'image')

  return Promise.all(
    params.instructions.map(async (instruction) => {
      const regex = /#Image\(([a-fA-F0-9]+)\)/g

      if (params.remove) {
        return instruction.replace(regex, '')
      }

      const matches = Array.from(instruction.matchAll(regex))

      if (matches.length === 0) {
        return instruction
      }

      const replacements = await Promise.all(
        matches.map(async (match) => {
          const hash = match[1]
          const png_path = storage.get_file_path(hash)

          try {
            if (params.as_paths) {
              if (!fs.existsSync(png_path)) {
                return { success: false }
              }
              if (params.copy_images_to_dir) {
                const images_dir = path.join(params.copy_images_to_dir, '.cwc')
                if (!fs.existsSync(images_dir)) {
                  await fs.promises.mkdir(images_dir, { recursive: true })
                }
                const dest_path = path.join(images_dir, path.basename(png_path))
                await fs.promises.copyFile(png_path, dest_path)
                return {
                  path: path
                    .relative(params.copy_images_to_dir, dest_path)
                    .replace(/\\/g, '/'),
                  success: true
                }
              }
              return {
                path: png_path.replace(/\\/g, '/'),
                success: true
              }
            } else {
              const buffer = await storage.load(hash)
              return {
                content_base64: buffer.toString('base64'),
                success: true
              }
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

        result_string += instruction.slice(last_index, match.index)

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

      result_string += instruction.slice(last_index)

      return result_string
    })
  )
}
