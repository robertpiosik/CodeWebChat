import { agentic_file_search_instructions } from '@/constants/instructions'
import { CodingAgent } from '../types'
import { check_command_exists } from '../utils'

let accumulated_output = ''

export const grok_agent: CodingAgent = {
  id: 'grok',
  label: 'Grok Build',
  cmd: 'grok',
  is_installed: () => check_command_exists('grok'),
  get_documentation_url: () => 'https://docs.x.ai/build/cli/headless-scripting',
  get_args: (query: string) => {
    accumulated_output = ''
    return [
      '-p',
      `${agentic_file_search_instructions}\n\n${query}`,
      '--output-format',
      'streaming-json',
      '--always-approve',
      '--no-auto-update'
    ]
  },
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.type === 'tool_call' && parsed.tool) {
      report_progress(parsed.tool)
    } else if (parsed.type === 'step_update' && parsed.step) {
      report_progress(parsed.step)
    } else if (parsed.method === 'session/update') {
      const update = parsed.params?.update
      if (update?.sessionUpdate === 'tool_call' && update.toolName) {
        report_progress(update.toolName)
      } else if (
        update?.sessionUpdate === 'agent_message_chunk' &&
        update.content?.text
      ) {
        accumulated_output += update.content.text
        return { output: accumulated_output }
      }
    } else if (parsed.type === 'message_chunk' && parsed.text) {
      accumulated_output += parsed.text
      return { output: accumulated_output }
    } else if (parsed.type === 'message' && parsed.text) {
      accumulated_output += parsed.text
      return { output: accumulated_output }
    }

    if (parsed.type === 'result' && parsed.result) {
      return {
        output:
          typeof parsed.result === 'string'
            ? parsed.result
            : parsed.result.text || parsed.result.response || ''
      }
    } else if (parsed.text && typeof parsed.text === 'string' && !parsed.type) {
      // Possible fallback for plain objects
      accumulated_output += parsed.text
      return { output: accumulated_output }
    }
  },
  parse_final_output: (parsed, current_output) => {
    if (parsed.type === 'result' && parsed.result) {
      return typeof parsed.result === 'string'
        ? parsed.result
        : parsed.result.text || parsed.result.response || ''
    } else if (parsed.text) {
      return parsed.text
    } else if (parsed.response) {
      return parsed.response
    } else if (parsed.output) {
      return typeof parsed.output === 'string'
        ? parsed.output
        : parsed.output.text || ''
    }
    return current_output || accumulated_output
  }
}