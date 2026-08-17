import * as path from 'path'
import * as fs from 'fs'

export const get_target_folder_path = async (
  item?: any
): Promise<string | undefined> => {
  let folder_path = item?.resourceUri?.fsPath
  if (folder_path) {
    try {
      const stats = await fs.promises.stat(folder_path)
      if (!stats.isDirectory()) {
        folder_path = path.dirname(folder_path)
      }
    } catch (error) {
      folder_path = undefined
    }
  }
  return folder_path
}
