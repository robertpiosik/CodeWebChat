import styles from './Configurations.module.scss'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import cn from 'classnames'
import { IconButton } from '../IconButton'

export namespace Configurations {
  export type Configuration = {
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
    on_manage_configurations: () => void
    selected_configuration_index?: number
    translations: {
      my_configurations: string
      missing_configuration_message: string
    }
  }
}

export const Configurations: React.FC<Configurations.Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <div className={styles['heading__title']}>
          {props.translations.my_configurations}
        </div>
        <IconButton
          codicon_icon="settings"
          on_click={props.on_manage_configurations}
        />
        {props.configurations.length == 0 && (
          <span
            className={`codicon codicon-arrow-left ${styles['arrow-animate']}`}
          />
        )}
      </div>

      {props.configurations.length == 0 && (
        <div className={styles['missing-config']}>
          {props.translations.missing_configuration_message}
        </div>
      )}

      <div className={styles.configurations}>
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
              key={i}
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
                <span>{configuration.model}</span>
                <span>{description}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
