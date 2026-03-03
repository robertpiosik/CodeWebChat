import { ProviderForClient } from '@/views/settings/types/messages'
import { SortableList } from '@ui/components/editor/settings/SortableList'
import { IconButton } from '@ui/components/editor/common/IconButton'
import { use_translation } from '../../i18n/use-translation'

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
        add_title: t('action.add-new'),
        item_text: t('action.model-provider'),
        items_text: t('action.model-providers')
      }}
      render_content={(provider) => {
        const is_localhost =
          provider.base_url.includes('localhost') ||
          provider.base_url.includes('127.0.0.1')

        return (
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
              {is_localhost ? '⠀⠀—' : provider.api_key_mask}
            </div>
            <div
              style={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {provider.base_url}
            </div>
          </>
        )
      }}
      render_actions={(provider, index) => {
        const is_localhost =
          provider.base_url.includes('localhost') ||
          provider.base_url.includes('127.0.0.1')

        return (
          <>
            <IconButton
              codicon_icon="insert"
              title={t('action.insert-provider')}
              on_click={() => props.on_add_provider({ insertion_index: index })}
            />
            {provider.type == 'custom' ? (
              <IconButton
                codicon_icon="edit"
                title={t('action.edit-provider')}
                on_click={() => props.on_edit_provider(provider.name)}
              />
            ) : (
              <IconButton
                codicon_icon="key"
                title={
                  is_localhost
                    ? t('action.api-key-not-required')
                    : t('action.change-api-key')
                }
                on_click={() => props.on_change_api_key(provider.name)}
                disabled={is_localhost}
              />
            )}
            <IconButton
              codicon_icon="trash"
              title={t('action.delete-provider')}
              on_click={() => props.on_delete_provider(provider.name)}
            />
          </>
        )
      }}
    />
  )
}
