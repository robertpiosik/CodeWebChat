import styles from './Configurations.module.scss'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import cn from 'classnames'
import { dictionary } from '@shared/constants/dictionary'
import { IconButton } from '../IconButton'
import { ReactSortable } from 'react-sortablejs'

const dict = dictionary['Configurations.tsx']

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
    on_configuration_click: (id: string) => void
    on_reorder?: (configurations: Configuration[]) => void
    selected_configuration_id?: string
    on_manage_configurations: () => void
  }
}

export const Configurations: React.FC<Configurations.Props> = (props) => {
  console.log('xxx', props.selected_configuration_id)
  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <div className={styles['heading__title']}>{dict.my_configurations}</div>

        <IconButton
          codicon_icon="edit"
          on_click={props.on_manage_configurations}
        />
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
          {props.configurations.map((configuration) => {
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

            console.log('xxx1', configuration.id)

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
