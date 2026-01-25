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
    } else {
      body.reasoning = { effort: 'medium' }
    }
  } else if (provider.name == 'Google') {
    let thinking_budget: number | undefined = undefined
    if (reasoning_effort) {
      if (reasoning_effort == 'none') {
        thinking_budget = 0
      } else if (reasoning_effort == 'low') {
        thinking_budget = 1024
      } else if (reasoning_effort == 'medium') {
        thinking_budget = 8192
      } else if (reasoning_effort == 'high') {
        thinking_budget = 24576
      }
    }
    body.extra_body = {
      google: {
        thinking_config: {
          include_thoughts: thinking_budget != 0 ? true : undefined,
          thinking_budget
        }
      }
    }
  }
}
