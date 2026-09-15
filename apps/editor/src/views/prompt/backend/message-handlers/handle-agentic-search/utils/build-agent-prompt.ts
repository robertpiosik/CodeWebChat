import * as vscode from 'vscode'
import { ai_file_search_format_instructions } from '@/constants/instructions'

export const build_agent_prompt = (query: string) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const task_instructions =
    config.get<string>('agenticSearchInstructions') ||
    config.inspect<string>('agenticSearchInstructions')?.defaultValue ||
    ''

  return `# Task\n\n${task_instructions}\n\n# Output formatting\n\n${ai_file_search_format_instructions}\n\n# Query\n\n${query}`
}
