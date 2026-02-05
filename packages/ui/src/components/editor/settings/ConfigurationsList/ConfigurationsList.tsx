import styles from './ConfigurationsList.module.scss'
import cn from 'classnames'
import { Radio } from '../../panel/Radio'
import { ReactSortable } from 'react-sortablejs'
import { IconButton } from '../../common/IconButton'
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
    on_add: (params?: {
      insertion_index?: number
      create_on_top?: boolean
    }) => void
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

  const render_item = (
    config: ConfigurationsList.Configuration,
    index: number
  ) => (
    <div key={config.id} className={styles.row}>
      {sortable && (
        <div className={cn(styles['drag-handle'], styles['col-drag'])}>
          <span className="codicon codicon-gripper" />
        </div>
      )}
      {props.on_set_default && (
        <Radio
          name={props.radio_group_name ?? 'default_configuration'}
          checked={!!config.is_default}
          title="Set as default"
          on_change={() => props.on_set_default?.(config.id)}
        />
      )}
      <div
        className={cn(styles.row__content, {
          [styles.clickable]: !!props.on_set_default
        })}
        onClick={() => props.on_set_default?.(config.id)}
      >
        <span>{config.model}</span>
        <span>{config.description}</span>
      </div>
      <div className={styles['col-actions']}>
        {sortable && (
          <IconButton
            codicon_icon="insert"
            title="Insert new configuration below/above"
            on_click={() => props.on_add({ insertion_index: index })}
          />
        )}
        <IconButton
          codicon_icon="edit"
          title="Edit configuration"
          on_click={() => props.on_edit(config.id)}
        />
        <IconButton
          codicon_icon="trash"
          title="Delete configuration"
          on_click={(e) => {
            e.stopPropagation()
            props.on_delete(config.id)
          }}
        />
      </div>
    </div>
  )

  const render_header = (is_top: boolean) => (
    <div className={styles.header}>
      <div className={styles['header__left']}>
        <div className={styles['header__left__amount']}>
          {props.configurations.length} configuration
          {props.configurations.length == 1 ? '' : 's'}
        </div>
        {props.on_unset_default && has_default && (
          <>
            <span>·</span>
            <TextButton on_click={props.on_unset_default}>
              Unset default
            </TextButton>
          </>
        )}
      </div>
      <IconButton
        codicon_icon="add"
        on_click={() =>
          props.on_add(is_top ? { create_on_top: true } : undefined)
        }
      />
    </div>
  )

  return (
    <div className={styles.container}>
      {render_header(true)}
      <div className={styles.list}>
        {props.configurations.length > 0 &&
          (sortable ? (
            <ReactSortable
              list={props.configurations}
              setList={(new_list) => {
                const has_order_changed =
                  new_list.length != props.configurations.length ||
                  new_list.some(
                    (item, index) => item.id != props.configurations[index].id
                  )

                if (has_order_changed) {
                  props.on_reorder(new_list)
                }
              }}
              tag="div"
              animation={150}
            >
              {props.configurations.map((item, index) =>
                render_item(item, index)
              )}
            </ReactSortable>
          ) : (
            props.configurations.map((item, index) => render_item(item, index))
          ))}
      </div>
      {props.configurations.length > 0 && render_header(false)}
    </div>
  )
}
