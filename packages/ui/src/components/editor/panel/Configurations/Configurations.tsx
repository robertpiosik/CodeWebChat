import styles from './Configurations.module.scss'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { IconButton } from '../IconButton/IconButton'
import { Button } from '../../common/Button'
import { ListHeader } from '../ListHeader'

export namespace Configurations {
  export type Configuration = {
    id: string
    model: string
    provider: string
    temperature?: number
    reasoning_effort?: string
    cache_enabled?: boolean
    is_pinned?: boolean
  }

  export type Props = {
    api_prompt_type: 'edit-context' | 'code-completions'
    configurations: Configuration[]
    on_configuration_click: (id: string) => void
    on_reorder?: (configurations: Configuration[]) => void
    on_toggle_pinned?: (id: string) => void
    selected_configuration_id?: string
    on_manage_configurations: () => void
    is_collapsed: boolean
    on_toggle_collapsed: (is_collapsed: boolean) => void
  }
}

export const Configurations: React.FC<Configurations.Props> = (props) => {
  const pinned_configurations = props.configurations.filter((c) => c.is_pinned)

  const render_configuration_item = (
    configuration: Configurations.Configuration,
    is_dragging_disabled: boolean
  ) => {
    const description_parts = [configuration.provider]
    if (configuration.reasoning_effort) {
      description_parts.push(`${configuration.reasoning_effort}`)
    }
    if (
      configuration.temperature &&
      configuration.temperature != DEFAULT_TEMPERATURE[props.api_prompt_type]
    ) {
      description_parts.push(`${configuration.temperature}`)
    }
    if (configuration.cache_enabled) {
      description_parts.push('cache-enabled')
    }

    const description = description_parts.join(' · ')

    return (
      <div
        key={configuration.id}
        className={cn(styles.configurations__item, {
          [styles['configurations__item--highlighted']]:
            props.selected_configuration_id == configuration.id
        })}
        onClick={() => {
          props.on_configuration_click(configuration.id)
        }}
        role="button"
      >
        <div className={styles.configurations__item__left}>
          {!is_dragging_disabled && (
            <div
              className={styles.configurations__item__left__drag_handle}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="codicon codicon-gripper" />
            </div>
          )}
          <div className={styles.configurations__item__left__text}>
            <span>{configuration.model}</span>
            <span>{description}</span>
          </div>
        </div>
        {props.on_toggle_pinned && (
          <div
            className={styles.configurations__item__right}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              codicon_icon={configuration.is_pinned ? 'pinned' : 'pin'}
              title={configuration.is_pinned ? 'Unpin' : 'Pin'}
              on_click={(e) => {
                e.stopPropagation()
                props.on_toggle_pinned?.(configuration.id)
              }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {pinned_configurations.length > 0 && (
        <div className={styles.configurations}>
          {pinned_configurations.map((i) => render_configuration_item(i, true))}
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
            codicon_icon="edit"
            on_click={(e) => {
              e.stopPropagation()
              props.on_manage_configurations()
            }}
            title="Edit Configurations"
          />
        }
      />
      {!props.is_collapsed && (
        <>
          <div className={styles.configurations}>
            <ReactSortable
              list={props.configurations}
              setList={(new_state) => {
                if (props.on_reorder) {
                  props.on_reorder(new_state)
                }
              }}
              animation={150}
              disabled={!props.on_reorder}
            >
              {props.configurations.map((i) =>
                render_configuration_item(i, false)
              )}
            </ReactSortable>
          </div>
          <div className={styles.footer}>
            <Button on_click={() => props.on_manage_configurations()}>
              Edit Configurations
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
