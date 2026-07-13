import * as os from 'os'
import * as path from 'path'

export const get_checkpoint_path = (timestamp: number): string => {
  const checkpoint_dir_name = `cwc-checkpoint-${timestamp}`
  return path.join(os.tmpdir(), checkpoint_dir_name)
}
