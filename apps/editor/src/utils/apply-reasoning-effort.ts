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
    if (reasoning_effort) {
      body.reasoning_effort = reasoning_effort
    }

    if (reasoning_effort && reasoning_effort != 'none') {
      body.extra_body = {
        google: {
          thinking_config: {
            include_thoughts: true
          }
        }
      }
    }
  }
}
