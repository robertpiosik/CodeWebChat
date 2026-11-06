import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import * as crypto from 'crypto'
import { GARBAGE_COLLECTION_THRESHOLD } from '@/constants/values'

export class PersistentPromptStorage<T extends 'text' | 'image'> {
  private dir_path: string
  private extension: string

  constructor(
    extension_context: vscode.ExtensionContext,
    private type: T
  ) {
    this.dir_path = path.join(
      extension_context.globalStorageUri.fsPath,
      type === 'text' ? 'prompt-text' : 'prompt-images'
    )
    this.extension = type === 'text' ? '.txt' : '.png'
  }

  async save(content: string): Promise<string> {
    const is_text = this.type === 'text'
    const buffer = is_text ? null : Buffer.from(content, 'base64')
    const hash_input = is_text ? content : new Uint8Array(buffer!)

    const id = crypto
      .createHash('sha256')
      .update(hash_input)
      .digest('hex')
      .substring(0, 16)

    if (!fs.existsSync(this.dir_path)) {
      await fs.promises.mkdir(this.dir_path, { recursive: true })
    }
    const filename = `${id}${this.extension}`
    const file_path = path.join(this.dir_path, filename)

    if (fs.existsSync(file_path)) {
      const now = new Date()
      await fs.promises.utimes(file_path, now, now)
    } else {
      if (is_text) {
        await fs.promises.writeFile(file_path, content, 'utf-8')
      } else {
        await fs.promises.writeFile(file_path, new Uint8Array(buffer!))
      }
    }

    await this.garbage_collect()

    return id
  }

  async load(id: string): Promise<T extends 'text' ? string : Buffer> {
    const file_path = this.get_file_path(id)
    if (this.type === 'text') {
      return (await fs.promises.readFile(file_path, 'utf-8')) as any
    } else {
      return (await fs.promises.readFile(file_path)) as any
    }
  }

  get_file_path(id: string): string {
    if (!/^[a-fA-F0-9]{16,64}$/.test(id)) {
      throw new Error('Invalid storage ID')
    }
    const filename = `${id}${this.extension}`
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
        if (file.endsWith(this.extension)) {
          const file_path = path.join(this.dir_path, file)
          try {
            const stats = await fs.promises.stat(file_path)
            if (stats.mtimeMs < threshold_time) {
              await fs.promises.unlink(file_path)
            }
          } catch {
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
