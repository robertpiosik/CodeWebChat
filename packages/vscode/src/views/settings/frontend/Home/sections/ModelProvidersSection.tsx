import { ProviderForClient } from '@/views/settings/types/messages'
import { ModelProviders } from '@ui/components/editor/settings/ModelProviders'

type ModelProvidersSectionProps = {
  providers: ProviderForClient[] | undefined
  on_reorder: (reordered_providers: ProviderForClient[]) => void
  on_add_provider: () => void
  on_delete_provider: (provider_name: string) => void
  on_rename_provider: (provider_name: string) => void
  on_change_api_key: (provider_name: string) => void
}
export const ModelProvidersSection: React.FC<ModelProvidersSectionProps> = (
  props
) => {
  return (
    <>
      {props.providers && (
        <ModelProviders
          providers={props.providers}
          on_reorder={props.on_reorder}
          on_add_provider={props.on_add_provider}
          on_delete_provider={props.on_delete_provider}
          on_rename_provider={props.on_rename_provider}
          on_change_api_key={props.on_change_api_key}
        />
      )}
    </>
  )
}
