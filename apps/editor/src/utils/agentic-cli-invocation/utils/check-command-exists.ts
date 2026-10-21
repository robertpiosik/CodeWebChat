import { execFileSync } from 'child_process'
import * as os from 'os'

export const check_command_exists = (cmd: string): boolean => {
  try {
    const is_windows = os.platform() == 'win32'
    execFileSync(is_windows ? 'where' : 'which', [cmd], {
      stdio: 'ignore'
    })
    return true
  } catch (e) {
    return false
  }
}
