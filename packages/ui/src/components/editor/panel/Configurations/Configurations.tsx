import styles from './Configurations.module.scss'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { IconButton } from '../../common/IconButton'
import { Button } from '../../common/Button'
import { ListHeader } from '../ListHeader'

export namespace Configurations {
  export type Configuration = {
    id: string
    model: string
    provider_name: string
    temperature?: number
    reasoning_effort?: string
    is_pinned?: boolean
  }

  export type Props = {
    api_prompt_type: 'edit-context' | 'code-at-cursor' | 'prune-context'
    configurations: Configuration[]
    on_configuration_click: (id: string) => void
    on_reorder: (configurations: Configuration[]) => void
    on_toggle_pinned: (id: string) => void
    selected_configuration_id?: string
    on_create: (params?: {
      create_on_top?: boolean
      insertion_index?: number
    }) => void
    on_edit: (id: string) => void
    on_delete: (id: string) => void
    is_collapsed: boolean
    on_toggle_collapsed: (is_collapsed: boolean) => void
  }
}

export const Configurations: React.FC<Configurations.Props> = (props) => {
  const pinned_configurations = props.configurations.filter((c) => c.is_pinned)

  const render_configuration_item = (
    configuration: Configurations.Configuration,
    is_dragging_disabled: boolean,
    index_for_insertion?: number
  ) => {
    const description_parts = [configuration.provider_name]
    if (configuration.reasoning_effort) {
      description_parts.push(`${configuration.reasoning_effort}`)
    }
    if (configuration.temperature != null) {
      description_parts.push(`${configuration.temperature}`)
    }

    const description = description_parts.join(' · ')

    return (
      <div
        key={configuration.id}
        className={cn(styles.configurations__item, {
          [styles['configurations__item--highlighted']]:
            props.selected_configuration_id == configuration.id
        })}
        onClick={() => props.on_configuration_click(configuration.id)}
        role="button"
        title="Initialize"
      >
        <div className={styles.configurations__item__left}>
          {!is_dragging_disabled && (
            <div
              className={styles['configurations__item__left__drag-handle']}
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <span className="codicon codicon-gripper" />
            </div>
          )}
          <div className={styles.configurations__item__left__text}>
            <span>{configuration.model}</span>
            <span>{description}</span>
          </div>
        </div>
        <div
          className={styles.configurations__item__right}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {props.on_toggle_pinned && (
            <IconButton
              codicon_icon={configuration.is_pinned ? 'pinned' : 'pin'}
              title={configuration.is_pinned ? 'Unpin' : 'Pin'}
              on_click={(e) => {
                e.stopPropagation()
                props.on_toggle_pinned(configuration.id)
              }}
            />
          )}
          {!is_dragging_disabled && (
            <IconButton
              codicon_icon="insert"
              title="Insert new configuration below/above"
              on_click={(e) => {
                e.stopPropagation()
                props.on_create({ insertion_index: index_for_insertion })
              }}
            />
          )}
          {props.on_edit && (
            <IconButton
              codicon_icon="edit"
              title="Edit"
              on_click={(e) => {
                e.stopPropagation()
                props.on_edit(configuration.id)
              }}
            />
          )}
          {props.on_delete && (
            <IconButton
              codicon_icon="trash"
              title="Delete"
              on_click={(e) => {
                e.stopPropagation()
                props.on_delete(configuration.id)
              }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {pinned_configurations.length > 0 && (
        <div className={styles.configurations}>
          {pinned_configurations.map((i) =>
            render_configuration_item(
              i,
              true,
              props.configurations.findIndex((c) => c.id === i.id)
            )
          )}
        </div>
      )}
      <ListHeader
        title="Configurations"
        is_collapsed={props.is_collapsed}
        on_toggle_collapsed={() =>
          props.on_toggle_collapsed(!props.is_collapsed)
        }
        actions={
          <IconButton
            codicon_icon="add"
            on_click={(e) => {
              e.stopPropagation()
              props.on_create({ create_on_top: true })
            }}
            title="New Configuration..."
          />
        }
      />
      {!props.is_collapsed && (
        <>
          <div className={styles.configurations}>
            {props.configurations.length === 0 && (
              <div className={styles.empty}>No configurations created yet.</div>
            )}
            <ReactSortable
              list={props.configurations}
              setList={(new_state) => {
                const has_order_changed =
                  new_state.length != props.configurations.length ||
                  new_state.some(
                    (item, index) => item.id != props.configurations[index].id
                  )

                if (has_order_changed) {
                  props.on_reorder(new_state)
                }
              }}
              animation={150}
            >
              {props.configurations.map((i, index) =>
                render_configuration_item(i, false, index)
              )}
            </ReactSortable>
          </div>
          <div className={styles.footer}>
            <Button on_click={() => props.on_create()}>
              New Configuration...
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
