import { CodingAgent } from '../types'
import { build_agent_prompt, check_command_exists } from '../utils'

export const codex_agent: CodingAgent = {
  id: 'codex',
  label: 'Codex',
  cmd: 'codex',
  is_installed: () => check_command_exists('codex'),
  get_documentation_url: () =>
    'https://learn.chatgpt.com/docs/non-interactive-mode',
  get_args: (query: string) => [
    'exec',
    build_agent_prompt(query),
    '--json'
  ],
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.type == 'item.started' && parsed.item) {
      const item = parsed.item
      if (item.type == 'command_execution' && item.command) {
        report_progress(item.command)
      } else if (item.type) {
        report_progress(item.type)
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
