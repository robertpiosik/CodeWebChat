import { ProviderForClient } from '@/views/settings/types/messages'
import { SortableList } from '@ui/components/editor/settings/SortableList'
import { IconButton } from '@ui/components/editor/common/IconButton'
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

  if (!props.providers) return null

  const items = props.providers.map((p) => ({ ...p, id: p.name }))

  return (
    <SortableList
      items={items}
      on_reorder={(reordered) => {
        props.on_reorder(reordered.map(({ id: _id, ...rest }) => rest))
      }}
      on_add={props.on_add_provider}
      translations={{
        add_title: t('settings.action.add-new'),
        insert_title: t('settings.action.insert-provider'),
        item_text: t('settings.action.model-provider'),
        items_text: t('settings.action.model-providers')
      }}
      render_content={(provider) => (
        <>
          <div
            style={{
              width: 90,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {provider.name}
          </div>
          <div
            style={{
              width: 50,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {provider.apiKeyMask}
          </div>
          <div
            style={{
              flex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {provider.baseUrl}
          </div>
        </>
      )}
      render_actions={(provider) => (
        <>
          {provider.type == 'custom' ? (
            <IconButton
              codicon_icon="edit"
              title={t('settings.action.edit-provider')}
              on_click={() => props.on_edit_provider(provider.name)}
            />
          ) : (
            <IconButton
              codicon_icon="key"
              title={t('settings.action.change-api-key')}
              on_click={() => props.on_change_api_key(provider.name)}
            />
          )}
          <IconButton
            codicon_icon="trash"
            title={t('settings.action.delete-provider')}
            on_click={() => props.on_delete_provider(provider.name)}
          />
        </>
      )}
    />
  )
}
