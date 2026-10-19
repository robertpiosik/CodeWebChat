import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import * as crypto from 'crypto'

export const GARBAGE_COLLECTION_THRESHOLD = 7884000000 // 3 months

export class PersistentTextStorage {
  private dir_path: string

  constructor(extension_context: vscode.ExtensionContext) {
    this.dir_path = path.join(
      extension_context.globalStorageUri.fsPath,
      'prompt-text'
    )
  }

  async save(content: string): Promise<string> {
    const id = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16)
    if (!fs.existsSync(this.dir_path)) {
      await fs.promises.mkdir(this.dir_path, { recursive: true })
    }
    const filename = `${id}.txt`
    const file_path = path.join(this.dir_path, filename)

    if (fs.existsSync(file_path)) {
      const now = new Date()
      await fs.promises.utimes(file_path, now, now)
    } else {
      await fs.promises.writeFile(file_path, content, 'utf-8')
    }

    await this.garbage_collect()

    return id
  }

  async load(id: string): Promise<string> {
    const filename = `${id}.txt`
    const file_path = path.join(this.dir_path, filename)
    return await fs.promises.readFile(file_path, 'utf-8')
  }

  get_file_path(id: string): string {
    const filename = `${id}.txt`
    return path.join(this.dir_path, filename)
  }

  private async garbage_collect() {
    try {
      if (!fs.existsSync(this.dir_path)) {
        return
      }
      const files = await fs.promises.readdir(this.dir_path)
      const threshold_time = Date.now() - GARBAGE_COLLECTION_THRESHOLD
      for (const file of files) {
        if (file.endsWith('.txt')) {
          const file_path = path.join(this.dir_path, file)
          try {
            const stats = await fs.promises.stat(file_path)
            if (stats.mtimeMs < threshold_time) {
              await fs.promises.unlink(file_path)
            }
          } catch (err) {
            // ignore
          }
        }
      }
    } catch (gc_error) {
      console.error(
        `Failed to garbage collect files in ${this.dir_path}:`,
        gc_error
      )
    }
  }
}
