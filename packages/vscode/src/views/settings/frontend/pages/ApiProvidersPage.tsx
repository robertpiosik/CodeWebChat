import { useEffect, useState } from 'react'
import {
  BackendMessage,
  ProviderForClient
} from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ApiProviders } from '@ui/components/editor/settings/ApiProviders'
import { Page } from '@ui/components/editor/settings/Page'

export const ApiProvidersPage = ({ vscode }: { vscode: any }) => {
  const [providers, set_providers] = useState<ProviderForClient[]>([])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'API_PROVIDERS') {
        set_providers(message.providers)
      }
    }
    window.addEventListener('message', handle_message)

    post_message(vscode, { command: 'GET_API_PROVIDERS' })

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  return (
    <Page
      title="API Providers"
      subtitle="Manage your API providers here. Add, edit, reorder, or delete providers as needed."
    >
      <ApiProviders
        providers={providers}
        on_reorder={(reordered_providers) => {
          set_providers(reordered_providers)
          post_message(vscode, {
            command: 'REORDER_API_PROVIDERS',
            providers: reordered_providers
          })
        }}
        on_add_provider={() => {
          post_message(vscode, { command: 'ADD_API_PROVIDER' })
        }}
        on_delete_provider={(provider_name) => {
          post_message(vscode, {
            command: 'DELETE_API_PROVIDER',
            provider_name
          })
        }}
        on_rename_provider={(provider_name) => {
          post_message(vscode, {
            command: 'RENAME_API_PROVIDER',
            provider_name
          })
        }}
        on_change_api_key={(provider_name) => {
          post_message(vscode, {
            command: 'CHANGE_API_PROVIDER_KEY',
            provider_name
          })
        }}
      />
    </Page>
  )
}
