import { ProviderForClient } from '@/views/settings/types/messages'
import { ModelProviders as UiModelProviders } from '@ui/components/editor/settings/ModelProviders'
import { use_translation } from '@/views/i18n/use-translation'

type ModelProvidersSectionProps = {
  providers: ProviderForClient[] | undefined
  on_reorder: (reordered_providers: ProviderForClient[]) => void
  on_add_provider: (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => void
  on_delete_provider: (provider_name: string) => void
  on_edit_provider: (provider_name: string) => void
  on_change_api_key: (provider_name: string) => void
}
export const ModelProvidersSection: React.FC<ModelProvidersSectionProps> = (
  props
) => {
  const { t } = use_translation()

  return (
    <>
      {props.providers && (
        <UiModelProviders
          translations={{
            add_title: t('settings.action.add-new'),
            insert_title: t('settings.action.insert-provider'),
            edit_title: t('settings.action.edit-provider'),
            change_api_key_title: t('settings.action.change-api-key'),
            delete_title: t('settings.action.delete-provider'),
            provider_text: t('settings.action.model-provider'),
            providers_text: t('settings.action.model-providers')
          }}
          providers={props.providers}
          on_reorder={props.on_reorder}
          on_add_provider={props.on_add_provider}
          on_delete_provider={props.on_delete_provider}
          on_edit_provider={props.on_edit_provider}
          on_change_api_key={props.on_change_api_key}
        />
      )}
    </>
  )
}
