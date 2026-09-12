import { execSync } from 'child_process'
import * as os from 'os'

export const check_command_exists = (cmd: string): boolean => {
  try {
    const is_windows = os.platform() == 'win32'
    execSync(`${is_windows ? 'where' : 'command -v'} ${cmd}`, {
      stdio: 'ignore'
    })
    return true
  } catch (e) {
    return false
  }
}
