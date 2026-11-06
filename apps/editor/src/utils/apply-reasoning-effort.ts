import { ApiConfiguration, Provider } from '@/services/providers-manager'
import { PROVIDERS } from '@/constants/providers'

export const apply_reasoning_effort = (params: {
  body: { [key: string]: any }
  provider: Provider
  reasoning_effort?: ApiConfiguration['reasoning_effort']
}) => {
  if (params.provider.base_url === 'https://openrouter.ai/api/v1') {
    if (params.reasoning_effort) {
      if (params.reasoning_effort === 'none') {
        params.body.reasoning = { enabled: false }
      } else {
        params.body.reasoning = { effort: params.reasoning_effort }
      }
    }
  } else if (
    params.provider.base_url ==
    'https://generativelanguage.googleapis.com/v1beta/openai/v1'
  ) {
    if (params.reasoning_effort) {
      params.body.extra_body = {
        google: {
          thinking_config: {
            thinking_level: params.reasoning_effort,
            include_thoughts: true
          }
        }
      }
    }
  } else if (params.provider.base_url === PROVIDERS.Anthropic.base_url) {
    if (params.reasoning_effort === 'none') {
      params.body.thinking = { type: 'disabled' }
    } else if (params.reasoning_effort) {
      params.body.thinking = { type: 'adaptive', display: 'summarized' }
      params.body.output_config = { effort: params.reasoning_effort }
    }
  } else if (params.provider.base_url === PROVIDERS.OpenAI.base_url) {
    if (params.reasoning_effort) {
      params.body.reasoning =
        params.reasoning_effort === 'none'
          ? { effort: 'none' }
          : { effort: params.reasoning_effort, summary: 'auto' }
    }
  } else {
    if (params.reasoning_effort) {
      params.body.reasoning_effort = params.reasoning_effort
    }
  }
}
