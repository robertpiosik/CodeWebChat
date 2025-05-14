import { useEffect, useState } from 'react'
import { ExtensionMessage, WebviewMessage } from '../../types/messages'
import { PROVIDERS } from '@shared/constants/providers'

type BuiltInProvider = {
  type: 'built-in'
  id: keyof typeof PROVIDERS
  api_key: string
}
type CustomProvider = {
  type: 'custom'
  name: string
  base_url: string
  api_key: string
}
export type Provider = BuiltInProvider | CustomProvider

export const use_providers = (vscode: any) => {
  const [providers, set_providers] = useState<Provider[]>([])

  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'PROVIDERS') {
        set_providers(message.providers)
      }
    }
    window.addEventListener('message', handle_message)
    vscode.postMessage({ command: 'GET_PROVIDERS' } as WebviewMessage)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_providers_update = (updated_providers: Provider[]) => {
    set_providers(updated_providers)
    vscode.postMessage({
      command: 'SAVE_PROVIDERS',
      providers: updated_providers
    } as WebviewMessage)
  }

  const handle_add_provider = () => {}

  return {
    providers,
    handle_providers_update,
    handle_add_provider
  }
}
