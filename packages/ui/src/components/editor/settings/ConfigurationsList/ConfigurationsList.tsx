import styles from './ConfigurationsList.module.scss'
import cn from 'classnames'
import { Radio } from '../../Radio'
import { ReactSortable } from 'react-sortablejs'
import { IconButton } from '../../IconButton'
import { Button } from '../../Button'

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
  }
}

export const ConfigurationsList: React.FC<ConfigurationsList.Props> = (
  props
) => {
  const sortable = props.on_reorder !== undefined
  const has_default = props.configurations.some((c) => c.is_default)

  const render_item = (config: ConfigurationsList.Configuration) => (
    <div key={config.id} className={styles.row}>
      {props.on_set_default && (
        <div className={styles.colRadio}>
          <Radio
            name="default_configuration"
            checked={!!config.is_default}
            title="Set as default"
            on_change={() => props.on_set_default?.(config.id)}
          />
        </div>
      )}
      {sortable && (
        <div className={cn(styles.dragHandle, styles.colDrag)}>
          <span className="codicon codicon-gripper" />
        </div>
      )}
      <div className={styles.row__content}>
        <span>{config.model}</span>
        <span>{config.description}</span>
      </div>
      <div className={styles.colActions}>
        {props.on_edit && (
          <span
            className="codicon codicon-edit"
            title="Edit configuration"
            onClick={() => props.on_edit?.(config.id)}
          />
        )}
        {props.on_delete && (
          <span
            className="codicon codicon-trash"
            title="Delete configuration"
            onClick={() => props.on_delete?.(config.id)}
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
        {props.on_unset_default && (
          <Button on_click={props.on_unset_default} disabled={!has_default}>
            Unset default
          </Button>
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
              handle={`.${styles.dragHandle}`}
              animation={150}
            >
              {props.configurations.map(render_item)}
            </ReactSortable>
          ) : (
            props.configurations.map(render_item)
          )
        ) : (
          <div className={styles.row}>
            <div className={styles.emptyMessage}>No configurations found.</div>
          </div>
        )}
      </div>
    </div>
  )
}
