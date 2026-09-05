import { PROVIDERS } from '@/constants/providers'
import { ModelProvider } from '@/services/model-providers-manager'

export const build_user_content = (params: {
  model_provider: ModelProvider
  part1: string
  part2: string
  is_explicit_cache_enabled?: boolean
}): any => {
  const parse_text_with_images = (text: string) => {
    if (!text.includes('<cwc-image>')) {
      return [{ type: 'text', text }]
    }
    const parsed: any[] = []
    const parts = text.split(/<cwc-image>([\s\S]*?)<\/cwc-image>/)
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (i % 2 == 0) {
        if (part.length > 0) {
          parsed.push({ type: 'text', text: part.trim() })
        }
      } else {
        parsed.push({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${part}`
          }
        })
      }
    }
    return parsed
  }

  const is_anthropic =
    params.model_provider.base_url == PROVIDERS.Anthropic.base_url
  const is_openai = params.model_provider.base_url == PROVIDERS.OpenAI.base_url

  if (is_anthropic || is_openai) {
    const cache_config: any = {}

    if (params.is_explicit_cache_enabled) {
      if (is_anthropic) {
        cache_config.cache_control = { type: 'ephemeral' }
        if (params.model_provider.extended_cache) {
          cache_config.cache_control.ttl = '1h'
        }
      } else if (is_openai) {
        cache_config.prompt_cache_breakpoint = { mode: 'explicit' }
      }
    }

    const user_content: any[] = [
      {
        type: 'text',
        text: params.part1,
        ...cache_config
      }
    ]

    if (!params.part2.includes('<cwc-image>')) {
      user_content.push({ type: 'text', text: params.part2 })
    } else {
      user_content.push(...parse_text_with_images(params.part2))
    }

    return user_content
  } else {
    const content = params.part1 + params.part2
    if (content.includes('<cwc-image>')) {
      return parse_text_with_images(content)
    }
    return content
  }
}
