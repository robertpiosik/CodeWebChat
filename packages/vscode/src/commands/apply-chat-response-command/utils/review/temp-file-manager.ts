import * as fs from 'fs'
import { PreparedFile } from './types'

export const create_temp_files_with_original_content = (
  prepared_files: PreparedFile[]
): void => {
  prepared_files.forEach((file) => {
    fs.writeFileSync(file.temp_file_path, file.original_content)
  })
}

export const cleanup_temp_files = (prepared_files: PreparedFile[]): void => {
  prepared_files.forEach((file) => {
    try {
      fs.unlinkSync(file.temp_file_path)
    } catch (e) {}
  })
}
