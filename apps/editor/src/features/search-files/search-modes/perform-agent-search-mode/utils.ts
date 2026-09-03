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

export const format_duration = (ms: number): string => {
  const total_seconds = Math.round(ms / 1000)
  const hours = Math.floor(total_seconds / 3600)
  const minutes = Math.floor((total_seconds % 3600) / 60)
  const seconds = total_seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}
