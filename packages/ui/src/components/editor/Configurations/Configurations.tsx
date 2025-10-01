import styles from './Configurations.module.scss'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import cn from 'classnames'
import { dictionary } from '@shared/constants/dictionary'
import { ReactSortable } from 'react-sortablejs'

export namespace Configurations {
  export type Configuration = {
    id: string
    model: string
    provider: string
    temperature?: number
    reasoning_effort?: string
    cache_enabled?: boolean
  }

  export type Props = {
    api_mode: 'edit-context' | 'code-completions'
    configurations: Configuration[]
    on_configuration_click: (i: number) => void
    on_reorder?: (configurations: Configuration[]) => void
    selected_configuration_index?: number
  }
}

export const Configurations: React.FC<Configurations.Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <div className={styles['heading__title']}>
          {dictionary['Configurations.tsx'].my_configurations}
        </div>
      </div>

      <div className={styles.configurations}>
        <ReactSortable
          list={props.configurations}
          setList={(new_state) => {
            if (props.on_reorder) {
              props.on_reorder(new_state)
            }
          }}
          animation={150}
          handle={`.${styles.configurations__item__left__drag_handle}`}
          disabled={!props.on_reorder}
        >
          {props.configurations.map((configuration, i) => {
            const description_parts = [configuration.provider]
            if (configuration.reasoning_effort) {
              description_parts.push(`${configuration.reasoning_effort}`)
            }
            if (
              configuration.temperature &&
              configuration.temperature != DEFAULT_TEMPERATURE[props.api_mode]
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
                    props.selected_configuration_index == i
                })}
                onClick={() => {
                  props.on_configuration_click(i)
                }}
                role="button"
              >
                <div className={styles.configurations__item__left}>
                  <div
                    className={cn(
                      styles.configurations__item__left__drag_handle,
                      {
                        [styles[
                          'configurations__item__left__drag_handle--disabled'
                        ]]: !props.on_reorder
                      }
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="codicon codicon-gripper" />
                  </div>
                  <div className={styles.configurations__item__left__text}>
                    <span>{configuration.model}</span>
                    <span>{description}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </ReactSortable>
      </div>
    </div>
  )
}
