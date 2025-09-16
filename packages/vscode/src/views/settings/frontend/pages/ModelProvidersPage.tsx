import { useEffect, useState } from 'react'
import {
  BackendMessage,
  ProviderForClient
} from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ApiProviders } from '@ui/components/editor/settings/ApiProviders'
import { Page } from '@ui/components/editor/settings/Page'

export const ModelProvidersPage = ({ vscode }: { vscode: any }) => {
  const [providers, set_providers] = useState<ProviderForClient[]>([])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'MODEL_PROVIDERS') {
        set_providers(message.providers)
      }
    }
    window.addEventListener('message', handle_message)

    post_message(vscode, { command: 'GET_MODEL_PROVIDERS' })

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  return (
    <Page
      title="Model Providers"
      subtitle="Manage your model providers here. Add, edit, reorder, or delete providers as needed."
    >
      <ApiProviders
        providers={providers}
        on_reorder={(reordered_providers) => {
          set_providers(reordered_providers)
          post_message(vscode, {
            command: 'REORDER_MODEL_PROVIDERS',
            providers: reordered_providers
          })
        }}
        on_add_provider={() => {
          post_message(vscode, { command: 'ADD_MODEL_PROVIDER' })
        }}
        on_delete_provider={(provider_name) => {
          post_message(vscode, {
            command: 'DELETE_MODEL_PROVIDER',
            provider_name
          })
        }}
        on_rename_provider={(provider_name) => {
          post_message(vscode, {
            command: 'RENAME_MODEL_PROVIDER',
            provider_name
          })
        }}
        on_change_api_key={(provider_name) => {
          post_message(vscode, {
            command: 'CHANGE_MODEL_PROVIDER_KEY',
            provider_name
          })
        }}
      />
    </Page>
  )
}
