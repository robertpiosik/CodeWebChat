import { ProviderForClient } from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ModelProviders } from '@ui/components/editor/settings/ModelProviders'
import { Page } from '@ui/components/editor/settings/Page'
import { forwardRef } from 'react'

type ModelProvidersPageProps = {
  id: string
  vscode: any
  providers: ProviderForClient[] | undefined
  set_providers: (providers: ProviderForClient[]) => void
}
export const ModelProvidersPage = forwardRef<
  HTMLDivElement,
  ModelProvidersPageProps
>((props, ref) => {
  return (
    <Page
      id={props.id}
      ref={ref}
      title="Model Providers"
      subtitle="Manage your model providers here. Add, edit, reorder, or delete providers as needed."
    >
      {props.providers && (
        <ModelProviders
          providers={props.providers}
          on_reorder={(reordered_providers) => {
            props.set_providers(reordered_providers)
            post_message(props.vscode, {
              command: 'REORDER_MODEL_PROVIDERS',
              providers: reordered_providers
            })
          }}
          on_add_provider={() => {
            post_message(props.vscode, { command: 'ADD_MODEL_PROVIDER' })
          }}
          on_delete_provider={(provider_name) => {
            post_message(props.vscode, {
              command: 'DELETE_MODEL_PROVIDER',
              provider_name
            })
          }}
          on_rename_provider={(provider_name) => {
            post_message(props.vscode, {
              command: 'RENAME_MODEL_PROVIDER',
              provider_name
            })
          }}
          on_change_api_key={(provider_name) => {
            post_message(props.vscode, {
              command: 'CHANGE_MODEL_PROVIDER_KEY',
              provider_name
            })
          }}
        />
      )}
    </Page>
  )
})
ModelProvidersPage.displayName = 'ModelProvidersPage'
