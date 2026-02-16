import { ToolConfig } from '@/services/model-providers-manager'

export const apply_reasoning_effort = (params: {
  body: { [key: string]: any }
  provider: any
  reasoning_effort?: ToolConfig['reasoning_effort']
}) => {
  if (params.provider.name == 'OpenRouter') {
    if (params.reasoning_effort) {
      if (params.reasoning_effort == 'none') {
        params.body.reasoning = { enabled: false }
      } else {
        params.body.reasoning = { effort: params.reasoning_effort }
      }
    }
  } else if (params.provider.name == 'Google') {
    params.body.extra_body = {
      google: {
        thinking_config: {
          thinking_level: params.reasoning_effort,
          include_thoughts: true
        }
      }
    }
  }
}
