import { ProviderForClient } from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ApiProviders } from '@ui/components/editor/settings/ApiProviders'
import { Page } from '@ui/components/editor/settings/Page'

type ModelProvidersPageProps = {
  vscode: any
  providers: ProviderForClient[] | undefined
  set_providers: (providers: ProviderForClient[]) => void
}
export const ModelProvidersPage = ({
  vscode,
  providers,
  set_providers
}: ModelProvidersPageProps) => {
  return (
    <Page
      title="Model Providers"
      subtitle="Manage your model providers here. Add, edit, reorder, or delete providers as needed."
    >
      {providers && (
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
      )}
    </Page>
  )
}
