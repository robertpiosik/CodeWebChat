import { CodingAgent } from '../types'
import { check_command_exists } from '../utils/check-command-exists'
import { AGENTS } from '../../../constants/agents'

let accumulated_output = ''

const agent_name = 'Grok Build'

export const grok_agent: CodingAgent = {
  id: 'grok',
  label: agent_name,
  cmd: 'grok',
  is_installed: () => check_command_exists('grok'),
  get_documentation_url: () => AGENTS[agent_name].docs_url!,
  get_edit_args: (prompt: string) => {
    accumulated_output = ''
    return [
      '-p',
      prompt,
      '--output-format',
      'streaming-json',
      '--always-approve',
    ]
  },
  get_ask_args: (prompt: string) => {
    accumulated_output = ''
    return [
      '-p',
      prompt,
      '--sandbox',
      'read-only',
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
