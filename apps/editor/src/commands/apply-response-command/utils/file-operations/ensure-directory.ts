import * as fs from 'fs'
import * as path from 'path'

export const ensure_directory_exists = async (file_path: string): Promise<void> => {
  const directory = path.dirname(file_path)
  if (!fs.existsSync(directory)) {
    await fs.promises.mkdir(directory, { recursive: true })
  }
}
