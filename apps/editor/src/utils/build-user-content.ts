import * as vscode from 'vscode'

export const build_user_content = (params: {
  provider_name: string
  part1: string
  part2: string
  disable_cache?: boolean
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

  if (params.provider_name == 'Anthropic') {
    const cache_control: any = { type: 'ephemeral' }
    const config = vscode.workspace.getConfiguration('codeWebChat')
    if (config.get('extendedCacheDurationForAnthropic')) {
      cache_control.ttl = '1h'
    }

    const user_content: any[] = [
      {
        type: 'text',
        text: params.part1,
        ...(!params.disable_cache && { cache_control })
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
