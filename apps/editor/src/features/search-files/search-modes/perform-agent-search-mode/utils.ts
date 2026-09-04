import * as vscode from 'vscode'
import { execSync } from 'child_process'
import * as os from 'os'
import {
  agentic_file_search_format_instructions,
  ai_file_search_task_instructions
} from '@/constants/instructions'

export const build_agent_prompt = (query: string) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const task_instructions =
    config.get<string>('agenticFileSearchInstructions') ||
    ai_file_search_task_instructions

  return `# Task\n\n${task_instructions}\n\n# Output formatting\n\n${agentic_file_search_format_instructions}\n\n# Query\n\n${query}`
}

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
