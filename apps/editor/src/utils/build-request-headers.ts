import { PROVIDERS } from '@/constants/providers'

export const build_request_headers = (params: {
  base_url: string
  api_key?: string
}): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (params.api_key) {
    if (params.base_url === PROVIDERS.Anthropic.base_url) {
      headers['x-api-key'] = params.api_key
      headers['anthropic-version'] = '2023-06-01'
    } else {
      headers['Authorization'] = `Bearer ${params.api_key}`
    }
  }

  if (params.base_url === PROVIDERS.OpenRouter.base_url) {
    headers['HTTP-Referer'] = 'https://codeweb.chat/'
    headers['X-Title'] = 'Code Web Chat'
  }

  return headers
}
