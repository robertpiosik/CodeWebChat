import styles from './ConfigurationsList.module.scss'
import cn from 'classnames'
import { Radio } from '../../Radio'
import { ReactSortable } from 'react-sortablejs'
import { IconButton } from '../../IconButton'

export namespace ConfigurationsList {
  export type Configuration = {
    id: string
    model: string
    description: string
    is_default?: boolean
  }

  export type Props = {
    configurations: Configuration[]
    on_reorder?: (configurations: Configuration[]) => void
    on_edit?: (configuration_id: string) => void
    on_delete?: (configuration_id: string) => void
    on_add?: () => void
    on_set_default?: (configuration_id: string) => void
  }
}

export const ConfigurationsList: React.FC<ConfigurationsList.Props> = ({
  configurations,
  on_reorder,
  on_edit,
  on_delete,
  on_add,
  on_set_default
}) => {
  const sortable = on_reorder !== undefined

  const render_item = (config: ConfigurationsList.Configuration) => (
    <div key={config.id} className={styles.row}>
      {on_set_default && (
        <div className={styles.colRadio}>
          <Radio
            name="default_configuration"
            checked={!!config.is_default}
            title="Set as default"
            on_change={() => on_set_default(config.id)}
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
      {(on_edit || on_delete) && (
        <div className={styles.colActions}>
          {on_edit && (
            <span
              className="codicon codicon-edit"
              title="Edit configuration"
              onClick={() => on_edit(config.id)}
            />
          )}
          {on_delete && (
            <span
              className="codicon codicon-trash"
              title="Delete configuration"
              onClick={() => on_delete(config.id)}
            />
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className={styles.container}>
      {on_add && (
        <div className={styles.toolbar}>
          <IconButton
            codicon_icon="add"
            on_click={on_add}
            title="New configuration"
          />
        </div>
      )}
      <div className={styles.list}>
        {configurations.length > 0 ? (
          sortable ? (
            <ReactSortable
              list={configurations}
              setList={(new_list) => {
                on_reorder!(new_list)
              }}
              tag="div"
              handle={`.${styles.dragHandle}`}
              animation={150}
            >
              {configurations.map(render_item)}
            </ReactSortable>
          ) : (
            configurations.map(render_item)
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
