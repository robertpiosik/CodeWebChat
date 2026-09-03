import { agentic_file_search_instructions } from '@/constants/instructions'
import { CodingAgent } from '../types'
import { check_command_exists } from '../utils'

export const claude_agent: CodingAgent = {
  id: 'claude',
  label: 'Claude Code',
  cmd: 'claude',
  is_installed: () => check_command_exists('claude'),
  get_documentation_url: () => 'https://code.claude.com/docs/en/headless',
  get_args: (query: string) => [
    '--bare',
    '-p',
    `${agentic_file_search_instructions}\n\n${query}`,
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'auto',
    '--include-partial-messages'
  ],
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.type == 'stream_event' && parsed.event) {
      if (
        parsed.event.type == 'content_block_start' &&
        parsed.event.content_block?.type == 'tool_use'
      ) {
        const tool_name = parsed.event.content_block.name
        if (tool_name) {
          report_progress(tool_name)
        }
      }
    } else if (parsed.type == 'result' && parsed.result) {
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || ''
      }
    } else if (parsed.result) {
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || ''
      }
    }
  },
  parse_final_output: (parsed, current_output) => {
    if (parsed.type == 'result' && parsed.result) {
      return typeof parsed.result == 'string'
        ? parsed.result
        : parsed.result.text || ''
    } else if (parsed.result) {
      return typeof parsed.result == 'string'
        ? parsed.result
        : parsed.result.text || ''
    }
    return current_output
  }
}
