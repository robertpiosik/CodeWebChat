import { agentic_file_search_instructions } from '@/constants/instructions'
import { CodingAgent } from '../types'
import { check_command_exists } from '../utils'

export const codex_agent: CodingAgent = {
  id: 'codex',
  label: 'Codex',
  cmd: 'codex',
  executable: 'codex',
  is_installed: () => check_command_exists('codex'),
  get_documentation_url: () =>
    'https://learn.chatgpt.com/docs/non-interactive-mode',
  get_args: (query: string) => [
    'exec',
    `${agentic_file_search_instructions}\n\n${query}`,
    '--json'
  ],
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.type == 'item.started' && parsed.item) {
      const item = parsed.item
      let msg = ''
      if (item.type == 'command_execution' && item.command) {
        msg = `Running: ${item.command}`
      } else if (item.type) {
        msg = `Running ${item.type.replace(/_/g, ' ')}...`
      }
      if (msg) {
        if (msg.length > 60) {
          msg = msg.substring(0, 57) + '...'
        }
        report_progress(msg)
      }
    } else if (parsed.type == 'item.completed' && parsed.item) {
      if (parsed.item.type == 'agent_message' && parsed.item.text) {
        return { output: parsed.item.text }
      }
    }
  },
  parse_final_output: (parsed, current_output) => {
    if (
      parsed.type == 'item.completed' &&
      parsed.item?.type == 'agent_message' &&
      parsed.item.text
    ) {
      return parsed.item.text
    }
    return current_output
  }
}
