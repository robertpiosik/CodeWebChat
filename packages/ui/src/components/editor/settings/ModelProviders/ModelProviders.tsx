import styles from './ModelProviders.module.scss'
import { ReactSortable } from 'react-sortablejs'
import cn from 'classnames'
import { IconButton } from '../../panel/IconButton'

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
    on_add_provider: () => void
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
  const render_item = (provider: ModelProviders.Provider) => (
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
        {provider.type === 'custom' && (
          <IconButton
            codicon_icon="edit"
            on_click={() => props.on_edit_provider(provider.name)}
            title="Edit provider"
          />
        )}
        {!provider.baseUrl.includes('localhost') && (
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

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <IconButton
          codicon_icon="add"
          on_click={props.on_add_provider}
          title="New provider"
        />
      </div>
      <div className={styles.list}>
        {props.providers.length > 0 ? (
          <ReactSortable
            list={with_ids(props.providers)}
            setList={(new_list) => {
              props.on_reorder(new_list.map(({ id, ...provider }) => provider))
            }}
            tag="div"
            handle={`.${styles['drag-handle']}`}
            animation={150}
          >
            {props.providers.map(render_item)}
          </ReactSortable>
        ) : (
          <div className={styles.row}>
            <div className={styles['empty-message']}>
              No model providers configured.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
