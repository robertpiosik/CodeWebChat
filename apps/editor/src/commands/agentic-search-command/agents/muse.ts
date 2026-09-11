import { CodingAgent } from '../types'
import { build_agent_prompt, check_command_exists, get_progress_dots } from '../utils'

let accumulated_output = ''
let last_action_name = ''
let action_count = 0

export const muse_agent: CodingAgent = {
  id: 'muse',
  label: 'Muse Code',
  cmd: 'muse',
  is_installed: () => check_command_exists('muse'),
  get_documentation_url: () =>
    'https://dev.meta.ai/docs/muse-code/extending#headless',
  get_args: (query: string) => {
    accumulated_output = ''
    return ['exec', '--json', '--yolo', build_agent_prompt(query)]
  },
  parse_stream_line: (parsed, report_progress) => {
    const payload = parsed.payload || parsed
    let action_name = ''

    if (payload.event?.task_kind?.startsWith('tool.')) {
      action_name = payload.event.task_kind.slice(5)
    } else if (payload.event?.operation?.startsWith('tool:')) {
      action_name = payload.event.operation.slice(5)
    } else if (payload.correlation_facts?.tool_name) {
      action_name = payload.correlation_facts.tool_name
    } else if (
      parsed.type === 'tool.result' ||
      parsed.type === 'tool_call' ||
      payload.type === 'tool_call'
    ) {
      const tool = payload.tool_name || payload.tool || payload.name
      if (tool)
        action_name = typeof tool === 'string' ? tool : JSON.stringify(tool)
    } else if (payload.tool) {
      const tool = payload.tool.name || payload.tool
      if (tool)
        action_name = typeof tool === 'string' ? tool : JSON.stringify(tool)
    }

    if (action_name) {
      action_name = action_name.replace(/_/g, ' ')
      if (action_name === last_action_name) {
        action_count++
      } else {
        last_action_name = action_name
        action_count = 1
      }
      report_progress(`${action_name}${get_progress_dots(action_count)}`)
    } else if (
      parsed.type === 'status' ||
      payload.type === 'status' ||
      parsed.type === 'run.model.configured'
    ) {
      const msg = payload.message || payload.status || parsed.type
      if (msg) report_progress(msg)
    }

    if (parsed.type === 'streamed' || payload.type === 'streamed') {
      if (payload.text) {
        accumulated_output += payload.text
        last_action_name = ''
        action_count = 0
        return { output: accumulated_output }
      }
    } else if (parsed.type === 'result' || payload.type === 'result') {
      const res = payload.result || payload
      if (res) {
        last_action_name = ''
        action_count = 0
        return {
          output: typeof res === 'string' ? res : res.text || res.response || ''
        }
      }
    }

    if (payload.text && typeof payload.text === 'string') {
      last_action_name = ''
      action_count = 0
      return { output: payload.text }
    } else if (payload.output) {
      last_action_name = ''
      action_count = 0
      return {
        output:
          typeof payload.output === 'string'
            ? payload.output
            : payload.output.text || ''
      }
    }
  },
  parse_final_output: (parsed, current_output) => {
    last_action_name = ''
    action_count = 0
    const payload = parsed.payload || parsed
    if (parsed.type === 'result' || payload.type === 'result') {
      const res = payload.result || payload
      if (res) {
        return typeof res === 'string' ? res : res.text || res.response || ''
      }
    } else if (payload.text) {
      return payload.text
    } else if (payload.output) {
      return typeof payload.output === 'string'
        ? payload.output
        : payload.output.text || ''
    }
    return current_output || accumulated_output
  }
}
