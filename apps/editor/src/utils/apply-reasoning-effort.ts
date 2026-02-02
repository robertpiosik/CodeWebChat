import { ToolConfig } from '@/services/model-providers-manager'

export const apply_reasoning_effort = (
  body: { [key: string]: any },
  provider: any,
  reasoning_effort?: ToolConfig['reasoning_effort']
): void => {
  if (provider.name == 'OpenRouter') {
    if (reasoning_effort) {
      if (reasoning_effort == 'none') {
        body.reasoning = { enabled: false }
      } else {
        body.reasoning = { effort: reasoning_effort }
      }
    }
  } else if (provider.name == 'Google') {
    body.extra_body = {
      google: {
        thinking_config: {
          thinking_level: reasoning_effort,
          include_thoughts: true
        }
      }
    }
  }
}
