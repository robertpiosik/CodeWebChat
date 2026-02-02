import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { OpenTempImageMessage } from '../../types/messages'

export const handle_open_temp_image = async (message: OpenTempImageMessage) => {
  try {
    const hash = message.hash
    const txt_filename = `cwc-image-${hash}.txt`
    const txt_path = path.join(os.tmpdir(), txt_filename)

    // Read base64 content
    let content_base64: string
    try {
      content_base64 = await fs.promises.readFile(txt_path, 'utf-8')
    } catch (err: any) {
      if (err.code == 'ENOENT') {
        vscode.window.showErrorMessage(
          'Image file not found (it may have been deleted).'
        )
        return
      }
      throw err
    }

    const buffer = Buffer.from(content_base64, 'base64')

    // Create a png file for viewing
    const png_filename = `cwc-image-${hash}.png`
    const png_path = path.join(os.tmpdir(), png_filename)

    await fs.promises.writeFile(png_path, buffer)

    // Open the image
    const uri = vscode.Uri.file(png_path)
    await vscode.commands.executeCommand('vscode.open', uri)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open image: ${error}`)
  }
}
