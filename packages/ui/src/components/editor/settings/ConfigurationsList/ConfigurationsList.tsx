import styles from './ConfigurationsList.module.scss'
import cn from 'classnames'
import { Radio } from '../../panel/Radio'
import { ReactSortable } from 'react-sortablejs'
import { IconButton } from '../../panel/IconButton'
import { TextButton } from '../TextButton'

export namespace ConfigurationsList {
  export type Configuration = {
    id: string
    model: string
    description: string
    is_default?: boolean
  }

  export type Props = {
    configurations: Configuration[]
    on_reorder: (configurations: Configuration[]) => void
    on_edit: (configuration_id: string) => void
    on_delete: (configuration_id: string) => void
    on_add: () => void
    on_set_default?: (configuration_id: string) => void
    on_unset_default?: () => void
    radio_group_name?: string
  }
}

export const ConfigurationsList: React.FC<ConfigurationsList.Props> = (
  props
) => {
  const sortable = props.on_reorder !== undefined
  const has_default = props.configurations.some((c) => c.is_default)

  const render_item = (config: ConfigurationsList.Configuration) => (
    <div key={config.id} className={styles.row}>
      {sortable && (
        <div className={cn(styles['drag-handle'], styles['col-drag'])}>
          <span className="codicon codicon-gripper" />
        </div>
      )}
      {props.on_set_default && (
        <div className={styles['col-radio']}>
          <Radio
            name={props.radio_group_name ?? 'default_configuration'}
            checked={!!config.is_default}
            title="Set as default"
            on_change={() => props.on_set_default?.(config.id)}
          />
        </div>
      )}
      <div className={styles.row__content}>
        <span>{config.model}</span>
        <span>{config.description}</span>
      </div>
      <div className={styles['col-actions']}>
        {props.on_edit && (
          <IconButton
            codicon_icon="edit"
            title="Edit configuration"
            on_click={() => props.on_edit?.(config.id)}
          />
        )}
        {props.on_delete && (
          <IconButton
            codicon_icon="trash"
            title="Delete configuration"
            on_click={() => props.on_delete?.(config.id)}
          />
        )}
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <IconButton
          codicon_icon="add"
          on_click={props.on_add}
          title="New configuration"
        />
        {props.on_unset_default && has_default && (
          <TextButton on_click={props.on_unset_default}>
            Unset default
          </TextButton>
        )}
      </div>
      <div className={styles.list}>
        {props.configurations.length > 0 ? (
          sortable ? (
            <ReactSortable
              list={props.configurations}
              setList={(new_list) => {
                props.on_reorder(new_list)
              }}
              tag="div"
              handle={`.${styles['drag-handle']}`}
              animation={150}
            >
              {props.configurations.map(render_item)}
            </ReactSortable>
          ) : (
            props.configurations.map(render_item)
          )
        ) : (
          <div className={styles.row}>
            <div className={styles['empty-message']}>
              No configurations found.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
