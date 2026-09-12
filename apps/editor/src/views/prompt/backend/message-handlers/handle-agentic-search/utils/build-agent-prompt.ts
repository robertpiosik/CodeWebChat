import * as vscode from 'vscode'
import {
  ai_file_search_format_instructions,
  agentic_search_task_instructions
} from '@/constants/instructions'

export const build_agent_prompt = (query: string) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const task_instructions =
    config.get<string>('agenticSearchInstructions') ||
    agentic_search_task_instructions

  return `# Task\n\n${task_instructions}\n\n# Output formatting\n\n${ai_file_search_format_instructions}\n\n# Query\n\n${query}`
}
