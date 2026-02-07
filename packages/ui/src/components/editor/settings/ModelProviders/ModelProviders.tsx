import styles from './ModelProviders.module.scss'
import { ReactSortable } from 'react-sortablejs'
import cn from 'classnames'
import { IconButton } from '../../common/IconButton'

export namespace ModelProviders {
  export type Provider = {
    name: string
    type: 'built-in' | 'custom'
    apiKeyMask: string
    baseUrl: string
  }

  export type Props = {
    providers: Provider[]
    on_reorder: (providers: Provider[]) => void
    on_add_provider: (params?: {
      insertion_index?: number
      create_on_top?: boolean
    }) => void
    on_delete_provider: (provider_name: string) => void
    on_edit_provider: (provider_name: string) => void
    on_change_api_key: (provider_name: string) => void
  }
}

const with_ids = (
  providers: ModelProviders.Provider[]
): (ModelProviders.Provider & { id: string })[] => {
  return providers.map((provider) => ({
    ...provider,
    id: provider.name
  }))
}

export const ModelProviders: React.FC<ModelProviders.Props> = (props) => {
  const render_item = (provider: ModelProviders.Provider, index: number) => (
    <div key={provider.name} className={styles.row}>
      <div className={cn(styles['drag-handle'], styles['col-drag'])}>
        <span className="codicon codicon-gripper" />
      </div>
      <div className={styles.row__content}>
        <div className={styles['col-name']}>{provider.name}</div>
        <div className={styles['col-api-key']}>{provider.apiKeyMask}</div>
        <div className={styles['col-base-url']}>{provider.baseUrl}</div>
      </div>
      <div className={styles['col-actions']}>
        <IconButton
          codicon_icon="insert"
          title="Insert a new provider below/above"
          on_click={() => props.on_add_provider({ insertion_index: index })}
        />
        {provider.type == 'custom' && (
          <IconButton
            codicon_icon="edit"
            on_click={() => props.on_edit_provider(provider.name)}
            title="Edit provider"
          />
        )}
        {provider.type != 'custom' && (
          <IconButton
            codicon_icon="key"
            on_click={() => props.on_change_api_key(provider.name)}
            title="Change API key"
          />
        )}
        <IconButton
          codicon_icon="trash"
          on_click={() => props.on_delete_provider(provider.name)}
          title="Delete provider"
        />
      </div>
    </div>
  )

  const render_header = (is_top: boolean) => (
    <div className={styles.header}>
      <div className={styles.header__amount}>
        {props.providers.length} model provider
        {props.providers.length == 1 ? '' : 's'}
      </div>
      <IconButton
        codicon_icon="add"
        on_click={() =>
          props.on_add_provider(is_top ? { create_on_top: true } : undefined)
        }
      />
    </div>
  )

  return (
    <div className={styles.container}>
      {render_header(true)}
      {props.providers.length > 0 && (
        <div className={styles.list}>
          <ReactSortable
            list={with_ids(props.providers)}
            setList={(new_list) => {
              const has_order_changed =
                new_list.length != props.providers.length ||
                new_list.some(
                  (item, index) => item.id != props.providers[index].name
                )

              if (has_order_changed) {
                props.on_reorder(
                  new_list.map(({ id, ...provider }) => provider)
                )
              }
            }}
            tag="div"
            animation={150}
          >
            {props.providers.map((p, i) => render_item(p, i))}
          </ReactSortable>
        </div>
      )}
      {props.providers.length > 0 && render_header(false)}
    </div>
  )
}
