import { agentic_file_search_instructions } from '@/constants/instructions'
import { CodingAgent } from '../types'
import { check_command_exists } from '../utils'

export const opencode_agent: CodingAgent = {
  id: 'opencode',
  label: 'OpenCode',
  cmd: 'opencode',
  is_installed: () => check_command_exists('opencode'),
  get_documentation_url: () => 'https://opencode.ai/docs/cli/',
  get_args: (query: string) => [
    'run',
    `${agentic_file_search_instructions}\n\n${query}`,
    '--format',
    'json',
    '--auto'
  ],
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.type == 'tool_call' && parsed.tool) {
      report_progress(parsed.tool)
    } else if (parsed.type == 'result' && parsed.result) {
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || ''
      }
    } else if (parsed.text) {
      return { output: parsed.text }
    } else if (parsed.output) {
      return {
        output:
          typeof parsed.output == 'string'
            ? parsed.output
            : parsed.output.text || ''
      }
    }
  },
  parse_final_output: (parsed, current_output) => {
    if (parsed.type == 'result' && parsed.result) {
      return typeof parsed.result == 'string'
        ? parsed.result
        : parsed.result.text || ''
    } else if (parsed.text) {
      return parsed.text
    } else if (parsed.output) {
      return typeof parsed.output == 'string'
        ? parsed.output
        : parsed.output.text || ''
    }
    return current_output
  }
}
